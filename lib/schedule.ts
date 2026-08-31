import type Database from "better-sqlite3";
import type { Template } from "./types";
import { WEEKDAY_LABELS } from "./types";

export interface ScheduledTemplate extends Template {
  exercise_count: number;
  total_sets: number;
  est_minutes: number;
}

export interface WeekDayEntry {
  weekday: number; // 0 = Monday .. 6 = Sunday
  label: string;
  isToday: boolean;
  workouts: ScheduledTemplate[];
}

export interface NextUp {
  template: ScheduledTemplate;
  weekday: number;
  /** "Today", "Tomorrow", or a weekday name. */
  when: string;
}

/** Today's weekday with Monday = 0 .. Sunday = 6. */
export function todayWeekday(now = new Date()): number {
  return (now.getDay() + 6) % 7;
}

function scheduledTemplates(db: Database.Database): ScheduledTemplate[] {
  const rows = db
    .prepare(
      `SELECT t.*,
              COUNT(te.id) AS exercise_count,
              COALESCE(SUM(te.target_sets), 0) AS total_sets,
              COALESCE(SUM(te.target_sets * (te.rest_seconds + 45)), 0) AS est_seconds
       FROM templates t
       LEFT JOIN template_exercises te ON te.template_id = t.id
       GROUP BY t.id
       ORDER BY t.id ASC`
    )
    .all() as Array<Template & {
    exercise_count: number;
    total_sets: number;
    est_seconds: number;
  }>;
  return rows.map((r) => ({
    ...r,
    // ~45s per working set plus its rest, rounded to 5 minutes.
    est_minutes: Math.max(10, Math.round(r.est_seconds / 60 / 5) * 5),
  }));
}

/** The full Monday-to-Sunday plan; days without a workout are rest days. */
export function getWeekPlan(db: Database.Database, now = new Date()): WeekDayEntry[] {
  const templates = scheduledTemplates(db);
  const today = todayWeekday(now);
  return WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    isToday: weekday === today,
    workouts: templates.filter((t) => t.weekday === weekday),
  }));
}

/** The next scheduled workout starting from today, scanning a full week. */
export function getNextUp(db: Database.Database, now = new Date()): NextUp | null {
  const templates = scheduledTemplates(db).filter((t) => t.weekday !== null);
  if (templates.length === 0) return null;
  const today = todayWeekday(now);
  for (let offset = 0; offset < 7; offset++) {
    const weekday = (today + offset) % 7;
    const match = templates.find((t) => t.weekday === weekday);
    if (match) {
      const when =
        offset === 0
          ? "Today"
          : offset === 1
            ? "Tomorrow"
            : WEEKDAY_LABELS[weekday];
      return { template: match, weekday, when };
    }
  }
  return null;
}
