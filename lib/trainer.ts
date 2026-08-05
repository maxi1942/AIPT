import { getDb } from "./db";
import { getExerciseHistory, getOverviewStats } from "./stats";
import type { SetLog, TemplateExercise, WorkoutSession } from "./types";

/**
 * Builds the grounding context for the AI trainer: the live state of the
 * current workout plus the lifter's historical numbers for every exercise
 * in the session, so advice is anchored in real training data.
 */
export function buildTrainerSystemPrompt(sessionId: number): string {
  const db = getDb();

  const session = db
    .prepare("SELECT * FROM workout_sessions WHERE id = ?")
    .get(sessionId) as WorkoutSession | undefined;
  if (!session) {
    throw new Error(`Workout session ${sessionId} not found`);
  }

  const templateExercises = session.template_id
    ? (db
        .prepare(
          `SELECT te.*, e.name AS exercise_name, e.muscle_group, e.equipment
           FROM template_exercises te
           JOIN exercises e ON e.id = te.exercise_id
           WHERE te.template_id = ?
           ORDER BY te.position ASC`
        )
        .all(session.template_id) as TemplateExercise[])
    : [];

  const sets = db
    .prepare(
      `SELECT s.*, e.name AS exercise_name
       FROM set_logs s
       JOIN exercises e ON e.id = s.exercise_id
       WHERE s.session_id = ?
       ORDER BY s.logged_at ASC, s.id ASC`
    )
    .all(sessionId) as SetLog[];

  // Every exercise relevant to this session: planned ones plus any the user
  // logged ad hoc.
  const exerciseIds = new Set<number>();
  for (const te of templateExercises) exerciseIds.add(te.exercise_id);
  for (const s of sets) exerciseIds.add(s.exercise_id);

  const lines: string[] = [];

  lines.push(`# Current workout: ${session.name}`);
  lines.push(`Started at: ${session.started_at} (UTC)`);
  lines.push("");

  if (templateExercises.length > 0) {
    lines.push("## Planned exercises and targets");
    for (const te of templateExercises) {
      const weight =
        te.target_weight != null ? ` @ ${te.target_weight} kg` : "";
      lines.push(
        `- ${te.exercise_name} (${te.muscle_group}): ${te.target_sets} sets x ${te.target_reps} reps${weight}, rest ${te.rest_seconds}s${te.notes ? ` — note: ${te.notes}` : ""}`
      );
    }
    lines.push("");
  }

  lines.push("## Sets logged so far in this session");
  if (sets.length === 0) {
    lines.push("(none yet)");
  } else {
    const byExercise = new Map<string, SetLog[]>();
    for (const s of sets) {
      const key = s.exercise_name ?? String(s.exercise_id);
      const list = byExercise.get(key) ?? [];
      list.push(s);
      byExercise.set(key, list);
    }
    for (const [name, list] of byExercise) {
      const parts = list.map(
        (s) =>
          `${s.reps} reps x ${s.weight} kg${s.rpe != null ? ` (RPE ${s.rpe})` : ""}`
      );
      lines.push(`- ${name}: ${parts.join(", ")}`);
    }
  }
  lines.push("");

  lines.push(
    "## Training history for the exercises in this session (per past session, oldest to newest)"
  );
  let anyHistory = false;
  for (const exerciseId of exerciseIds) {
    const history = getExerciseHistory(exerciseId, 6).filter(
      (h) => h.session_id !== sessionId
    );
    if (history.length === 0) continue;
    anyHistory = true;
    const name = (
      db.prepare("SELECT name FROM exercises WHERE id = ?").get(exerciseId) as
        | { name: string }
        | undefined
    )?.name;
    lines.push(`### ${name ?? `Exercise ${exerciseId}`}`);
    for (const h of history) {
      lines.push(
        `- ${h.date.slice(0, 10)}: ${h.sets} sets, total volume ${h.total_volume} kg, top set ${h.top_weight} kg x ${h.top_reps}, est. 1RM ${h.est_1rm} kg`
      );
    }
  }
  if (!anyHistory) {
    lines.push(
      "(no prior history — this may be the lifter's first logged session for these exercises)"
    );
  }
  lines.push("");

  const overview = getOverviewStats();
  lines.push("## Overall training summary");
  lines.push(
    `- Completed sessions: ${overview.totalSessions}, sessions in the last 30 days: ${overview.sessionsLast30Days}`
  );
  lines.push(
    `- Lifetime sets logged: ${overview.totalSets}, lifetime volume: ${overview.totalVolume} kg`
  );

  return `You are an experienced, evidence-based personal trainer coaching a lifter live, mid-workout, through a chat panel in their workout-logging app. All data below comes straight from the app's database and is the ground truth.

Coaching style:
- Be concise and direct — the lifter is between sets, resting. A few sentences is usually right; use short lists only when comparing concrete numbers.
- Anchor every recommendation in their actual numbers: compare today's sets to their recent history, call out when a weight or rep count beats (or falls short of) previous sessions, and push progressive overload when the data supports it (e.g. suggest +2.5 kg or +1 rep when they hit the top of a rep range).
- Watch for red flags: big jumps in load (>10% over last session), signs of fatigue (reps dropping sharply across sets, high RPE), and advise deloads or form focus when warranted.
- Answer questions about exercise form and substitutions plainly. For pain (not normal muscle burn), advise stopping the movement and seeing a professional — do not diagnose.
- Weights are in kilograms. Do not invent history that is not in the data; if there is no history, say so and coach conservatively.

${lines.join("\n")}`;
}
