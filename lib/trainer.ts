import { cardioEffortStr, CARDIO_BY_GOAL, zoneLabel, zonesPromptBlock } from "./cardio";
import { getDb } from "./db";
import { ensureSessionExercises } from "./sessionPlan";
import { getCardioHistory, getExerciseHistory, getOverviewStats } from "./stats";
import { GOAL_LABELS } from "./types";
import type { SetLog, UserProfile, WorkoutSession } from "./types";

/** Evidence-based programming guidance the PT applies, per training goal. */
export const GOAL_COACHING: Record<UserProfile["goal"], string> = {
  strength: `The lifter's goal is STRENGTH. Coach accordingly:
- Main lifts: 3-6 reps per set at RPE 7-9, full rest between sets (2-5 minutes — tell them to actually take it).
- Progress load when all planned sets hit the top of the rep range at RPE ≤ 8: +2.5 kg upper body, +5 kg lower body.
- Warm-up ramps matter at these intensities: suggest ~bar/40% x 8, 60% x 5, 80% x 2-3 of the working weight before the first work set.
- Technique first: if bar speed grinds or reps fall 2+ below target, cut the weight 5-10%, don't grind into failure.`,
  size: `The lifter's goal is MUSCLE SIZE (hypertrophy). Coach accordingly:
- Work mostly in 6-12 reps (isolation up to 15), taking sets to 0-3 reps in reserve (RPE 7-10).
- Use double progression: add reps until the top of the range on all sets, then add 2.5 kg and rebuild.
- Rest 90-120s on compounds, 60-90s on isolation — enough to perform, not so long the session drags.
- Push effort on the last set; watch for junk volume (sets far from failure don't grow muscle).`,
  fat_loss: `The lifter's goal is FAT LOSS while keeping muscle. Coach accordingly:
- Keep loads heavy enough to defend muscle (6-12 reps at honest effort) — do NOT turn everything into light circuits.
- Keep rest shorter (45-90s) for session density, but never at the cost of losing weight on the bar week to week.
- Maintaining strength in a deficit is winning; flag when performance drops repeatedly (sleep/food/recovery check).
- Remind them the deficit comes from diet; training preserves the muscle.`,
  maintain: `The lifter's goal is MAINTAINING their physique. Coach accordingly:
- Moderate volume at RPE 7-8, 6-12 reps; consistency beats intensity.
- Hold weights and reps around recent numbers; progress only when it feels easy.
- Keep sessions efficient — hitting each muscle ~2x/week at maintenance volume is enough.`,
};

function getProfile(): UserProfile | null {
  const db = getDb();
  return (
    (db.prepare("SELECT * FROM user_profile WHERE id = 1").get() as
      | UserProfile
      | undefined) ?? null
  );
}

/**
 * Builds the grounding context for the AI trainer: the lifter's profile and
 * goal, the live state of the current workout, and historical numbers for
 * every exercise in the session, so advice is anchored in real data.
 */
export function buildTrainerSystemPrompt(sessionId: number): string {
  const db = getDb();

  const session = db
    .prepare("SELECT * FROM workout_sessions WHERE id = ?")
    .get(sessionId) as WorkoutSession | undefined;
  if (!session) {
    throw new Error(`Workout session ${sessionId} not found`);
  }

  const profile = getProfile();
  const sessionExercises = ensureSessionExercises(db, sessionId);

  const sets = db
    .prepare(
      `SELECT s.*, e.name AS exercise_name
       FROM set_logs s
       JOIN exercises e ON e.id = s.exercise_id
       WHERE s.session_id = ?
       ORDER BY s.logged_at ASC, s.id ASC`
    )
    .all(sessionId) as SetLog[];

  const exerciseIds = new Set<number>();
  for (const se of sessionExercises) exerciseIds.add(se.exercise_id);
  for (const s of sets) exerciseIds.add(s.exercise_id);

  const lines: string[] = [];

  if (profile) {
    lines.push("# Lifter profile");
    lines.push(
      `- Goal: ${GOAL_LABELS[profile.goal]} · Experience: ${profile.experience} · Trains ${profile.days_per_week}x/week · Equipment: ${profile.equipment.replace("_", " ")}`
    );
    const stats: string[] = [];
    if (profile.age) stats.push(`age ${profile.age}`);
    if (profile.height_cm) stats.push(`${profile.height_cm} cm`);
    if (profile.weight_kg) stats.push(`${profile.weight_kg} kg body weight`);
    if (profile.sex) stats.push(profile.sex);
    if (stats.length) lines.push(`- ${stats.join(", ")}`);
    lines.push("");
  }

  lines.push(`# Current workout: ${session.name}`);
  lines.push(`Started at: ${session.started_at} (UTC)`);
  lines.push("");

  if (sessionExercises.length > 0) {
    lines.push("## Today's plan (in order)");
    for (const se of sessionExercises) {
      if (se.exercise_kind === "cardio") {
        const parts: string[] = [];
        if (se.target_duration_min) parts.push(`${se.target_duration_min} min`);
        if (se.target_distance_km) parts.push(`${se.target_distance_km} km`);
        if (se.target_zone)
          parts.push(`in ${zoneLabel(se.target_zone, profile?.age)}`);
        lines.push(
          `- ${se.exercise_name} (cardio): ${parts.join(", ") || "free effort"}${se.notes ? ` — note: ${se.notes}` : ""}`
        );
        continue;
      }
      const weight =
        se.target_weight != null ? ` @ ${se.target_weight} kg` : "";
      lines.push(
        `- ${se.exercise_name} (${se.muscle_group}): ${se.target_sets} sets x ${se.target_reps} reps${weight}, rest ${se.rest_seconds}s${se.notes ? ` — note: ${se.notes}` : ""}`
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
      const parts = list.map((s) =>
        s.duration_seconds != null || s.distance_km != null
          ? cardioEffortStr(s)
          : `${s.reps} reps x ${s.weight} kg${s.rpe != null ? ` (RPE ${s.rpe})` : ""}`
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
    const meta = db
      .prepare("SELECT name, kind FROM exercises WHERE id = ?")
      .get(exerciseId) as { name: string; kind: string } | undefined;

    if (meta?.kind === "cardio") {
      const history = getCardioHistory(exerciseId, 6).filter(
        (h) => h.session_id !== sessionId
      );
      if (history.length === 0) continue;
      anyHistory = true;
      lines.push(`### ${meta.name} (cardio)`);
      for (const h of history) {
        lines.push(
          `- ${h.date.slice(0, 10)}: ${cardioEffortStr({
            duration_seconds: h.duration_seconds || null,
            distance_km: h.distance_km || null,
            avg_hr: h.avg_hr,
          })}`
        );
      }
      continue;
    }

    const history = getExerciseHistory(exerciseId, 6).filter(
      (h) => h.session_id !== sessionId
    );
    if (history.length === 0) continue;
    anyHistory = true;
    lines.push(`### ${meta?.name ?? `Exercise ${exerciseId}`}`);
    for (const h of history) {
      lines.push(
        `- ${h.date.slice(0, 10)}: ${h.sets} sets, total volume ${h.total_volume} kg, top set ${h.top_weight} kg x ${h.top_reps}, est. 1RM ${h.est_1rm} kg`
      );
    }
  }
  if (!anyHistory) {
    lines.push(
      "(no prior history — likely the lifter's first logged session for these exercises; coach conservatively and help them find working weights)"
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

  const goalBlock = profile
    ? `${GOAL_COACHING[profile.goal]}\n\n${CARDIO_BY_GOAL[profile.goal]}`
    : "The lifter has not set a goal yet — coach for general fitness (8-12 reps, RPE 7-9, 90s rest) and suggest they set up their profile for tailored programming.";

  const zonesBlock = zonesPromptBlock(profile?.age);

  return `You are an experienced, evidence-based personal trainer coaching a lifter LIVE, mid-workout, through their workout-logging app. All data below comes straight from the app's database and is the ground truth.

You are proactive, like a PT standing next to them:
- Some of your turns are triggered automatically by app events, marked "SESSION EVENT". React to these exactly as instructed in the event — instantly useful, no filler, no greetings after the first message.
- Always give a concrete next action with numbers: exact weight for the next set, reps to aim for, rest time. Never answer with only encouragement.
- Compare each set against the plan and their history: call out PRs, beating last session, or falling short — with the actual numbers.
- Ask at most one short question at a time (e.g. "how did that feel?"), and only when the answer changes your next recommendation.

${goalBlock}

${zonesBlock}

Cardio coaching rules:
- Cardio efforts are logged as time, distance, and average heart rate — judge them against the planned zone and past sessions (same HR at faster pace = fitter; HR drifting above zone = go slower or shorten).
- For intervals, prescribe them concretely: work time, target zone/effort, recovery time, number of reps.
- After a cardio effort, react like after a set: 1-2 sentences, judged against the target zone/duration, with a concrete next step.

Safety and coaching rules:
- Watch for red flags: load jumps >10% over last session, reps collapsing across sets, RPE 10 early in the session — recommend backing off when you see them.
- For pain (not normal muscle burn): stop the movement, suggest a substitute, recommend a professional if it persists. Do not diagnose.
- Weights are in kilograms. Round barbell suggestions to 2.5 kg, dumbbells to typical gym increments.
- Do not invent history that is not in the data; if there is none, say so and help them find a starting weight.
- Be concise: 1-3 short sentences for set feedback, max ~5 for anything else. The lifter is mid-workout.

${lines.join("\n")}`;
}
