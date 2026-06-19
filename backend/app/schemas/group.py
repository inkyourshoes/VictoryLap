from datetime import datetime, date
from pydantic import BaseModel


class GroupCreate(BaseModel):
    name: str


class GroupOut(BaseModel):
    id: str
    name: str
    invite_code: str
    created_by: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class GroupMemberOut(BaseModel):
    id: str
    group_id: str
    user_id: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class GroupGoalCreate(BaseModel):
    title: str
    description: str | None = None
    target_date: date | None = None


class GroupGoalOut(BaseModel):
    id: str
    group_id: str
    created_by: str | None
    title: str
    description: str | None
    target_date: date | None
    completed: bool
    completed_by: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class GroupMessageOut(BaseModel):
    id: str
    group_id: str
    user_id: str
    username: str
    content: str
    attachment_url: str | None = None
    attachment_type: str | None = None
    sent_at: datetime


class GroupDetailOut(GroupOut):
    members: list[GroupMemberOut]
    goals: list[GroupGoalOut]
