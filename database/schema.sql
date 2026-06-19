-- VictoryLap Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       TEXT NOT NULL UNIQUE,
    username    TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE goals (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    completed   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workouts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    notes       TEXT,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exercises (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id  UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE sets (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_number  INTEGER NOT NULL,
    reps        INTEGER,
    weight_kg   NUMERIC(6, 2),
    duration_seconds INTEGER,
    notes       TEXT
);

-- Indexes
CREATE INDEX idx_workouts_user_id     ON workouts(user_id);
CREATE INDEX idx_workouts_performed_at ON workouts(user_id, performed_at DESC);
CREATE INDEX idx_exercises_workout_id  ON exercises(workout_id);
CREATE INDEX idx_sets_exercise_id      ON sets(exercise_id);
CREATE INDEX idx_goals_user_id         ON goals(user_id);
