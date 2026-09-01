import type Database from "better-sqlite3";
import type { SessionExercise } from "./types";

/**
 * The per-session exercise plan. Copied from the template when a session
 * starts so mid-workout edits (swap/remove/add) never touch the saved
 * design. Sessions created before this table existed are back-filled here.
 */
export function ensureSessionExercises(
  db: Database.Database,
  sessionId: number
): SessionExercise[] {
  const select = db.prepare(
    `SELECT se.*, e.name AS exercise_name, e.muscle_group, e.equipment, e.kind AS exercise_kind
     FROM session_exercises se
     JOIN exercises e ON e.id = se.exercise_id
     WHERE se.session_id = ?
     ORDER BY se.position ASC`
  );

  let rows = select.all(sessionId) as SessionExercise[];
  if (rows.length > 0) return rows;

  const session = db
    .prepare("SELECT template_id FROM workout_sessions WHERE id = ?")
    .get(sessionId) as { template_id: number | null } | undefined;
  if (!session?.template_id) return [];

  copyTemplateToSession(db, session.template_id, sessionId);
  rows = select.all(sessionId) as SessionExercise[];
  return rows;
}

export function copyTemplateToSession(
  db: Database.Database,
  templateId: number,
  sessionId: number
): void {
  db.prepare(
    `INSERT INTO session_exercises
       (session_id, exercise_id, position, target_sets, target_reps, target_weight, rest_seconds, notes,
        target_duration_min, target_distance_km, target_zone)
     SELECT ?, exercise_id, position, target_sets, target_reps, target_weight, rest_seconds, notes,
            target_duration_min, target_distance_km, target_zone
     FROM template_exercises WHERE template_id = ?
     ORDER BY position ASC`
  ).run(sessionId, templateId);
}
