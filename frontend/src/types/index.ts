export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
}

export interface SetData {
  id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  notes: string | null;
}

export interface Exercise {
  id: string;
  workout_id: string;
  name: string;
  order_index: number;
  sets: SetData[];
}

export interface Workout {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  performed_at: string;
  created_at: string;
  exercises: Exercise[];
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
}

export interface GroupGoal {
  id: string;
  group_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  target_date: string | null;
  completed: boolean;
  completed_by: string | null;
  created_at: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  username: string;
  content: string;
  attachment_url: string | null;
  attachment_type: 'image' | 'video' | 'file' | null;
  sent_at: string;
}

export interface GroupDetail extends Group {
  members: GroupMember[];
  goals: GroupGoal[];
}

export interface WorkoutCreatePayload {
  title: string;
  notes?: string;
  performed_at?: string;
  exercises: {
    name: string;
    order_index?: number;
    sets: {
      set_number: number;
      reps?: number;
      weight_kg?: number;
      duration_seconds?: number;
      notes?: string;
    }[];
  }[];
}
