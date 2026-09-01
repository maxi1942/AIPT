import { CARDIO_BY_GOAL, zonesPromptBlock } from "./cardio";
import { getDb } from "./db";
import { getWeekPlan, getNextUp } from "./schedule";
import { getOverviewStats } from "./stats";
import { GOAL_COACHING } from "./trainer";
import { GOAL_LABELS } from "./types";
import type { UserProfile, WorkoutSession } from "./types";

/**
 * Grounding context for the always-on coach (home tab): profile, the weekly
 * schedule, recent training, and overall stats. Unlike the in-workout
 * trainer, this coach plans and adjusts the week rather than calling out
 * individual sets.
 */
export function buildCoachSystemPrompt(): string {
  const db = getDb();

  const profile =
    (db.prepare("SELECT * FROM user_profile WHERE id = 1").get() as
      | UserProfile
      | undefined) ?? null;

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
  } else {
    lines.push("# Lifter profile");
    lines.push(
      "(not set up yet — suggest they complete their profile so you can tailor the plan)"
    );
  }
  lines.push("");

  lines.push("# Weekly schedule (Monday to Sunday)");
  const week = getWeekPlan(db);
  for (const day of week) {
    const marker = day.isToday ? " (TODAY)" : "";
    if (day.workouts.length === 0) {
      lines.push(`- ${day.label}${marker}: Rest day`);
    } else {
      for (const w of day.workouts) {
        lines.push(
          `- ${day.label}${marker}: ${w.name} — ${w.exercise_count} exercises, ~${w.est_minutes} min (template id ${w.id})`
        );
      }
    }
  }
  const nextUp = getNextUp(db);
  if (nextUp) {
    lines.push(
      `- Next up: ${nextUp.template.name} (${nextUp.when.toLowerCase() === "today" || nextUp.when.toLowerCase() === "tomorrow" ? nextUp.when : `on ${nextUp.when}`})`
    );
  }
  lines.push("");

  const activeSession = db
    .prepare(
      "SELECT * FROM workout_sessions WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1"
    )
    .get() as WorkoutSession | undefined;
  if (activeSession) {
    lines.push(
      `# Active workout right now: "${activeSession.name}" (started ${activeSession.started_at} UTC) — they can resume it from the app.`
    );
    lines.push("");
  }

  lines.push("# Recent completed sessions (newest first)");
  const recent = db
    .prepare(
      `SELECT ws.name, ws.started_at,
              COUNT(sl.id) AS sets,
              COALESCE(SUM(sl.reps * sl.weight), 0) AS volume
       FROM workout_sessions ws
       LEFT JOIN set_logs sl ON sl.session_id = ws.id
       WHERE ws.finished_at IS NOT NULL
       GROUP BY ws.id
       ORDER BY ws.started_at DESC
       LIMIT 5`
    )
    .all() as Array<{
    name: string;
    started_at: string;
    sets: number;
    volume: number;
  }>;
  if (recent.length === 0) {
    lines.push("(none yet)");
  } else {
    for (const r of recent) {
      lines.push(
        `- ${r.started_at.slice(0, 10)}: ${r.name} — ${r.sets} sets, ${Math.round(r.volume)} kg total volume`
      );
    }
  }
  lines.push("");

  const overview = getOverviewStats();
  lines.push("# Overall training summary");
  lines.push(
    `- Completed sessions: ${overview.totalSessions}, sessions in the last 30 days: ${overview.sessionsLast30Days}`
  );
  lines.push(
    `- Lifetime sets logged: ${overview.totalSets}, lifetime volume: ${Math.round(overview.totalVolume)} kg`
  );
  lines.push(
    `- Cardio in the last 30 days: ${overview.cardioMinutesLast30Days} min, ${overview.cardioKmLast30Days} km`
  );

  const goalBlock = profile
    ? `${GOAL_COACHING[profile.goal]}\n\n${CARDIO_BY_GOAL[profile.goal]}\n\n${zonesPromptBlock(profile.age)}`
    : "The lifter has not set a goal yet — coach for general fitness (8-12 reps, RPE 7-9, 90s rest) and suggest they set up their profile for tailored programming.";

  return `You are the lifter's personal trainer inside their workout app — the first thing they see when they open it. All data below comes straight from the app's database and is the ground truth.

Your job on this screen:
- Plan and adjust their training week: which days to train, what to focus on, when to rest.
- Answer training questions (technique, programming, recovery, nutrition basics) with evidence-based, practical advice.
- When they ask to change the schedule (e.g. "3 days this week", "work around a sore shoulder", "go heavier"), give a concrete revised plan referencing their actual scheduled workouts by name, and tell them they can apply changes in the Plan tab (edit a workout, change its day) or regenerate from their profile. You cannot edit the schedule directly yet.
- Encourage starting today's scheduled workout when there is one; during a workout the in-session trainer takes over the set-by-set coaching.

${goalBlock}

Style:
- Warm but efficient, like a great coach texting you — max ~5 short sentences unless a plan genuinely needs more.
- Concrete over generic: use their real workout names, real numbers, and their goal.
- Ask at most one short question at a time, and only when the answer changes your recommendation.
- For pain (not normal soreness): suggest a work-around and a professional if it persists. Do not diagnose.
- Weights are in kilograms.

${lines.join("\n")}`;
}
