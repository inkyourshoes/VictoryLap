import json
import logging
from datetime import date

from anthropic import AsyncAnthropic
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..models.feed import FeedEntry
from ..models.user import User

router = APIRouter(prefix="/feed", tags=["feed"])
logger = logging.getLogger(__name__)

DAILY_TYPES = ["workout_of_day", "challenge", "exercise_spotlight"]
WEEKLY_TYPES = ["weekly_competition"]

LABELS = {
    "workout_of_day": "Workout of the Day",
    "challenge": "Challenge of the Day",
    "exercise_spotlight": "Exercise Spotlight",
    "weekly_competition": "Weekly Competition",
}


class FeedItemOut(BaseModel):
    entry_type: str
    label: str
    title: str
    content: str
    period: str

    model_config = {"from_attributes": True}


_FALLBACKS = {
    "workout_of_day": {
        "title": "5-Round Grinder",
        "content": "5 rounds: 10 pull-ups, 20 push-ups, 30 air squats. Rest 90 seconds between rounds. Track your total time.",
    },
    "challenge": {
        "title": "100 Burpee Challenge",
        "content": "Complete 100 burpees today — break them up however you need. Log your total time in the group chat.",
    },
    "exercise_spotlight": {
        "title": "Romanian Deadlift",
        "content": "Hinge at the hips, soft bend in the knees, bar stays close to your legs. Great for hamstring strength and hip mobility. 3x10 at moderate weight.",
    },
    "weekly_competition": {
        "title": "Most Workouts This Week",
        "content": "Most workouts logged by Sunday night wins bragging rights. Post your sessions in the crew chat to keep each other accountable.",
    },
}


async def _generate_via_anthropic(types: list[str]) -> dict[str, dict]:
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    type_descriptions = {
        "workout_of_day": "a complete workout (exercises, sets/reps or rounds, rest periods)",
        "challenge": "a single daily physical challenge (one focused task, e.g. max reps, timed effort)",
        "exercise_spotlight": "one exercise with form tips and why it's worth doing",
        "weekly_competition": "a fun week-long competition idea members can track in their group",
    }
    items_prompt = "\n".join(
        f'- "{t}": {type_descriptions[t]}' for t in types
    )
    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": (
                    f"You are generating content for Victory Lap, a fitness group app with a gritty, "
                    f"street-workout / calisthenics / powerlifting vibe. Today is {date.today().isoformat()}.\n\n"
                    f"Generate the following feed items. Return ONLY a JSON object with one key per item type. "
                    f"Each value must have 'title' (short, punchy, all-caps style) and 'content' (1-3 sentences, direct, no fluff).\n\n"
                    f"Items needed:\n{items_prompt}\n\n"
                    f"Example format:\n"
                    f'{{"workout_of_day": {{"title": "...", "content": "..."}}}}'
                ),
            }
        ],
    )
    raw = message.content[0].text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return json.loads(raw)


async def _get_or_generate(db: AsyncSession) -> list[FeedEntry]:
    today = date.today().isoformat()
    iso = date.today().isocalendar()
    week_period = f"{iso[0]}-W{iso[1]:02d}"

    # Fetch existing entries
    result = await db.execute(
        select(FeedEntry).where(
            or_(
                and_(FeedEntry.entry_type.in_(DAILY_TYPES), FeedEntry.period == today),
                and_(FeedEntry.entry_type.in_(WEEKLY_TYPES), FeedEntry.period == week_period),
            )
        )
    )
    existing = {e.entry_type: e for e in result.scalars().all()}

    missing = []
    for t in DAILY_TYPES:
        if t not in existing:
            missing.append((t, today))
    for t in WEEKLY_TYPES:
        if t not in existing:
            missing.append((t, week_period))

    if missing:
        missing_types = [t for t, _ in missing]
        try:
            if settings.anthropic_api_key:
                generated = await _generate_via_anthropic(missing_types)
            else:
                generated = {t: _FALLBACKS[t] for t in missing_types}
        except Exception:
            logger.exception("Feed generation failed, using fallbacks")
            generated = {t: _FALLBACKS.get(t, {"title": t, "content": ""}) for t in missing_types}

        for entry_type, period in missing:
            item = generated.get(entry_type, _FALLBACKS.get(entry_type, {"title": entry_type, "content": ""}))
            db.add(FeedEntry(
                entry_type=entry_type,
                period=period,
                title=item["title"],
                content=item["content"],
            ))
        try:
            await db.commit()
        except Exception:
            await db.rollback()
            logger.exception("Failed to save feed entries")

        result = await db.execute(
            select(FeedEntry).where(
                or_(
                    and_(FeedEntry.entry_type.in_(DAILY_TYPES), FeedEntry.period == today),
                    and_(FeedEntry.entry_type.in_(WEEKLY_TYPES), FeedEntry.period == week_period),
                )
            )
        )
        existing = {e.entry_type: e for e in result.scalars().all()}

    # Return in a fixed display order
    order = ["workout_of_day", "challenge", "exercise_spotlight", "weekly_competition"]
    return [existing[t] for t in order if t in existing]


@router.get("/", response_model=list[FeedItemOut])
async def get_feed(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entries = await _get_or_generate(db)
    return [
        FeedItemOut(
            entry_type=e.entry_type,
            label=LABELS[e.entry_type],
            title=e.title,
            content=e.content,
            period=e.period,
        )
        for e in entries
    ]
