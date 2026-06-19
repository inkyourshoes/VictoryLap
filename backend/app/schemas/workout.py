from datetime import datetime
from pydantic import BaseModel


class SetCreate(BaseModel):
    set_number: int
    reps: int | None = None
    weight_kg: float | None = None
    duration_seconds: int | None = None
    notes: str | None = None


class SetOut(SetCreate):
    id: str
    exercise_id: str

    model_config = {"from_attributes": True}


class ExerciseCreate(BaseModel):
    name: str
    order_index: int = 0
    sets: list[SetCreate] = []


class ExerciseOut(BaseModel):
    id: str
    workout_id: str
    name: str
    order_index: int
    sets: list[SetOut]

    model_config = {"from_attributes": True}


class WorkoutCreate(BaseModel):
    title: str
    notes: str | None = None
    performed_at: datetime | None = None
    exercises: list[ExerciseCreate] = []


class WorkoutOut(BaseModel):
    id: str
    user_id: str
    title: str
    notes: str | None
    performed_at: datetime
    created_at: datetime
    exercises: list[ExerciseOut]

    model_config = {"from_attributes": True}
