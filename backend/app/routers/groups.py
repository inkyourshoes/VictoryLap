import json
import mimetypes
import uuid
from collections import defaultdict
from pathlib import Path

import cloudinary
import cloudinary.uploader

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, WebSocket, WebSocketDisconnect, status
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..auth import get_current_user
from ..config import settings  # noqa: used for JWT + Cloudinary config
from ..database import get_db
from ..models.group import Group, GroupGoal, GroupMember, GroupMessage
from ..models.user import User
from ..schemas.group import (
    GroupCreate,
    GroupDetailOut,
    GroupGoalCreate,
    GroupGoalOut,
    GroupMessageOut,
    GroupOut,
)

UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Configure Cloudinary if credentials are provided
if settings.cloudinary_cloud_name:
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )

router = APIRouter(prefix="/groups", tags=["groups"])


class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, group_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active[group_id].append(websocket)

    def disconnect(self, group_id: str, websocket: WebSocket):
        if websocket in self.active[group_id]:
            self.active[group_id].remove(websocket)

    async def broadcast(self, group_id: str, message: dict):
        for connection in list(self.active[group_id]):
            await connection.send_text(json.dumps(message, default=str))


manager = ConnectionManager()


async def _require_member(group_id: str, user_id: str, db: AsyncSession) -> None:
    result = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this crew")


# NOTE: /invite/{code} must come before /{group_id} to avoid path capture
@router.get("/invite/{invite_code}", response_model=GroupOut)
async def get_group_by_invite_code(
    invite_code: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Group).where(Group.invite_code == invite_code))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    return group


@router.post("/", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
async def create_group(
    body: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = Group(name=body.name, created_by=current_user.id)
    db.add(group)
    await db.flush()
    db.add(GroupMember(group_id=group.id, user_id=current_user.id))
    await db.commit()
    await db.refresh(group)
    return group


@router.get("/", response_model=list[GroupOut])
async def list_my_groups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == current_user.id)
    )
    return result.scalars().all()


@router.get("/{group_id}", response_model=GroupDetailOut)
async def get_group(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(group_id, current_user.id, db)
    result = await db.execute(
        select(Group)
        .where(Group.id == group_id)
        .options(
            selectinload(Group.members),
            selectinload(Group.goals),
        )
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Crew not found")
    return group


@router.post("/join-by-code/{invite_code}", response_model=GroupOut)
async def join_group_by_code(
    invite_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Group).where(Group.invite_code == invite_code))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    existing = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group.id,
            GroupMember.user_id == current_user.id,
        )
    )
    if not existing.scalar_one_or_none():
        db.add(GroupMember(group_id=group.id, user_id=current_user.id))
        await db.commit()
    return group


@router.post("/{group_id}/upload")
async def upload_group_attachment(
    group_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(group_id, current_user.id, db)
    mime = file.content_type or mimetypes.guess_type(file.filename or "")[0] or ""
    if mime.startswith("image/"):
        attachment_type = "image"
        resource_type = "image"
    elif mime.startswith("video/"):
        attachment_type = "video"
        resource_type = "video"
    else:
        attachment_type = "file"
        resource_type = "raw"

    contents = await file.read()

    if settings.cloudinary_cloud_name:
        result = cloudinary.uploader.upload(
            contents,
            resource_type=resource_type,
            folder="victorylap",
        )
        attachment_url = result["secure_url"]
    else:
        # Local dev fallback
        suffix = Path(file.filename or "upload").suffix or ""
        filename = f"{uuid.uuid4().hex}{suffix}"
        (UPLOADS_DIR / filename).write_bytes(contents)
        attachment_url = f"/uploads/{filename}"

    return {"attachment_url": attachment_url, "attachment_type": attachment_type}


@router.get("/{group_id}/messages", response_model=list[GroupMessageOut])
async def get_group_messages(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(group_id, current_user.id, db)
    result = await db.execute(
        select(GroupMessage)
        .where(GroupMessage.group_id == group_id)
        .options(selectinload(GroupMessage.user))
        .order_by(GroupMessage.sent_at.desc())
        .limit(50)
    )
    messages = list(reversed(result.scalars().all()))
    return [
        GroupMessageOut(
            id=m.id,
            group_id=m.group_id,
            user_id=m.user_id,
            username=m.user.username,
            content=m.content,
            attachment_url=m.attachment_url,
            attachment_type=m.attachment_type,
            sent_at=m.sent_at,
        )
        for m in messages
    ]


@router.post("/{group_id}/goals", response_model=GroupGoalOut, status_code=status.HTTP_201_CREATED)
async def create_group_goal(
    group_id: str,
    body: GroupGoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(group_id, current_user.id, db)
    goal = GroupGoal(
        group_id=group_id,
        created_by=current_user.id,
        title=body.title,
        description=body.description,
        target_date=body.target_date,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.patch("/{group_id}/goals/{goal_id}/complete", response_model=GroupGoalOut)
async def complete_group_goal(
    group_id: str,
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(group_id, current_user.id, db)
    result = await db.execute(
        select(GroupGoal).where(GroupGoal.id == goal_id, GroupGoal.group_id == group_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal.completed = True
    goal.completed_by = current_user.id
    await db.commit()
    await db.refresh(goal)
    return goal


@router.websocket("/{group_id}/ws")
async def group_chat_ws(
    group_id: str,
    websocket: WebSocket,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    # Authenticate via JWT query param (WebSocket API does not support custom headers)
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str | None = payload.get("sub")
        if not user_id:
            await websocket.close(code=1008)
            return
    except JWTError:
        await websocket.close(code=1008)
        return

    user = await db.get(User, user_id)
    if not user:
        await websocket.close(code=1008)
        return

    membership = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
        )
    )
    if not membership.scalar_one_or_none():
        await websocket.close(code=1008)
        return

    await manager.connect(group_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                payload = json.loads(raw)
                content = str(payload.get("content", "")).strip()
                attachment_url = payload.get("attachment_url") or None
                attachment_type = payload.get("attachment_type") or None
            except (json.JSONDecodeError, AttributeError):
                content = raw.strip()
                attachment_url = None
                attachment_type = None

            if not content and not attachment_url:
                continue

            msg = GroupMessage(
                group_id=group_id,
                user_id=user.id,
                content=content,
                attachment_url=attachment_url,
                attachment_type=attachment_type,
            )
            db.add(msg)
            await db.commit()
            await db.refresh(msg)
            await manager.broadcast(
                group_id,
                {
                    "id": msg.id,
                    "group_id": msg.group_id,
                    "user_id": msg.user_id,
                    "username": user.username,
                    "content": msg.content,
                    "attachment_url": msg.attachment_url,
                    "attachment_type": msg.attachment_type,
                    "sent_at": msg.sent_at.isoformat(),
                },
            )
    except WebSocketDisconnect:
        manager.disconnect(group_id, websocket)
