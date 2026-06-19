from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models.user import User
from ..models.workout import Workout, Exercise, Set
from ..schemas.workout import WorkoutCreate, WorkoutOut
from ..auth import get_current_user

router = APIRouter(prefix="/workouts", tags=["workouts"])


@router.post("/", response_model=WorkoutOut, status_code=status.HTTP_201_CREATED)
async def create_workout(
    body: WorkoutCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workout = Workout(
        user_id=current_user.id,
        title=body.title,
        notes=body.notes,
        performed_at=body.performed_at or datetime.now(timezone.utc),
    )
    db.add(workout)
    await db.flush()  # get workout.id before adding children

    for i, ex_data in enumerate(body.exercises):
        exercise = Exercise(
            workout_id=workout.id,
            name=ex_data.name,
            order_index=ex_data.order_index if ex_data.order_index else i,
        )
        db.add(exercise)
        await db.flush()

        for s_data in ex_data.sets:
            db.add(Set(
                exercise_id=exercise.id,
                set_number=s_data.set_number,
                reps=s_data.reps,
                weight_kg=s_data.weight_kg,
                duration_seconds=s_data.duration_seconds,
                notes=s_data.notes,
            ))

    await db.commit()

    result = await db.execute(
        select(Workout)
        .where(Workout.id == workout.id)
        .options(selectinload(Workout.exercises).selectinload(Exercise.sets))
    )
    return result.scalar_one()


@router.get("/", response_model=list[WorkoutOut])
async def list_workouts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 20,
):
    result = await db.execute(
        select(Workout)
        .where(Workout.user_id == current_user.id)
        .options(selectinload(Workout.exercises).selectinload(Exercise.sets))
        .order_by(Workout.performed_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/{workout_id}", response_model=WorkoutOut)
async def get_workout(
    workout_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workout)
        .where(Workout.id == workout_id, Workout.user_id == current_user.id)
        .options(selectinload(Workout.exercises).selectinload(Exercise.sets))
    )
    workout = result.scalar_one_or_none()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(
    workout_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workout).where(Workout.id == workout_id, Workout.user_id == current_user.id)
    )
    workout = result.scalar_one_or_none()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    await db.delete(workout)
    await db.commit()
