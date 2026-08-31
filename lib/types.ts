export interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
  equipment: string;
  is_custom: number;
}

export interface Template {
  id: number;
  name: string;
  description: string;
  created_at: string;
  /** 0 = Monday .. 6 = Sunday, null = unscheduled. */
  weekday: number | null;
  exercise_count?: number;
}

export const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export interface CoachMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface TemplateExercise {
  id: number;
  template_id: number;
  exercise_id: number;
  position: number;
  target_sets: number;
  target_reps: string;
  target_weight: number | null;
  rest_seconds: number;
  notes: string;
  exercise_name?: string;
  muscle_group?: string;
  equipment?: string;
}

export interface WorkoutSession {
  id: number;
  template_id: number | null;
  name: string;
  started_at: string;
  finished_at: string | null;
  notes: string;
}

export interface SetLog {
  id: number;
  session_id: number;
  exercise_id: number;
  set_number: number;
  reps: number;
  weight: number;
  rpe: number | null;
  logged_at: string;
  exercise_name?: string;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface SessionExercise {
  id: number;
  session_id: number;
  exercise_id: number;
  position: number;
  target_sets: number;
  target_reps: string;
  target_weight: number | null;
  rest_seconds: number;
  notes: string;
  exercise_name?: string;
  muscle_group?: string;
  equipment?: string;
}

export type Goal = "size" | "fat_loss" | "strength" | "maintain";
export type Experience = "beginner" | "intermediate" | "advanced";
export type EquipmentAccess = "full_gym" | "dumbbells" | "bodyweight";

export interface UserProfile {
  id: 1;
  goal: Goal;
  experience: Experience;
  days_per_week: number;
  equipment: EquipmentAccess;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  sex: string | null;
  updated_at: string;
}

export const GOAL_LABELS: Record<Goal, string> = {
  size: "Build muscle size",
  fat_loss: "Lose fat",
  strength: "Get stronger",
  maintain: "Maintain physique",
};

export interface SessionDetail {
  session: WorkoutSession;
  sessionExercises: SessionExercise[];
  sets: SetLog[];
  chat: ChatMessage[];
}

export interface ExerciseHistoryPoint {
  session_id: number;
  date: string;
  total_volume: number;
  top_weight: number;
  top_reps: number;
  est_1rm: number;
  sets: number;
}

/** Epley formula estimate of one-rep max. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}
