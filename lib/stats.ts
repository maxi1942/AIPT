import { getDb } from "./db";
import { estimateOneRepMax, type ExerciseHistoryPoint } from "./types";

interface SetRow {
  session_id: number;
  started_at: string;
  reps: number;
  weight: number;
}

/**
 * Per-session summary for one exercise, oldest first.
 * Only counts finished or in-progress sessions that actually logged sets.
 */
export function getExerciseHistory(
  exerciseId: number,
  limit = 20
): ExerciseHistoryPoint[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.session_id, w.started_at, s.reps, s.weight
       FROM set_logs s
       JOIN workout_sessions w ON w.id = s.session_id
       WHERE s.exercise_id = ?
       ORDER BY w.started_at ASC, s.set_number ASC`
    )
    .all(exerciseId) as SetRow[];

  const bySession = new Map<number, SetRow[]>();
  for (const row of rows) {
    const list = bySession.get(row.session_id) ?? [];
    list.push(row);
    bySession.set(row.session_id, list);
  }

  const points: ExerciseHistoryPoint[] = [];
  for (const [sessionId, sets] of bySession) {
    let totalVolume = 0;
    let best = { weight: 0, reps: 0, est: 0 };
    for (const s of sets) {
      totalVolume += s.reps * s.weight;
      const est = estimateOneRepMax(s.weight, s.reps);
      if (est > best.est) best = { weight: s.weight, reps: s.reps, est };
    }
    points.push({
      session_id: sessionId,
      date: sets[0].started_at,
      total_volume: Math.round(totalVolume),
      top_weight: best.weight,
      top_reps: best.reps,
      est_1rm: Math.round(best.est * 10) / 10,
      sets: sets.length,
    });
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  return points.slice(-limit);
}

export interface OverviewStats {
  totalSessions: number;
  sessionsLast30Days: number;
  totalSets: number;
  totalVolume: number;
  volumeByWeek: Array<{ week: string; volume: number }>;
  topExercises: Array<{ exercise_id: number; name: string; sets: number }>;
}

export function getOverviewStats(): OverviewStats {
  const db = getDb();

  const totalSessions = (
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM workout_sessions WHERE finished_at IS NOT NULL"
      )
      .get() as { n: number }
  ).n;

  const sessionsLast30Days = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM workout_sessions
         WHERE started_at >= datetime('now', '-30 days')`
      )
      .get() as { n: number }
  ).n;

  const totals = db
    .prepare(
      "SELECT COUNT(*) AS sets, COALESCE(SUM(reps * weight), 0) AS volume FROM set_logs"
    )
    .get() as { sets: number; volume: number };

  const volumeByWeek = db
    .prepare(
      `SELECT strftime('%Y-%W', w.started_at) AS week,
              ROUND(SUM(s.reps * s.weight)) AS volume
       FROM set_logs s
       JOIN workout_sessions w ON w.id = s.session_id
       WHERE w.started_at >= datetime('now', '-84 days')
       GROUP BY week
       ORDER BY week ASC`
    )
    .all() as Array<{ week: string; volume: number }>;

  const topExercises = db
    .prepare(
      `SELECT s.exercise_id, e.name, COUNT(*) AS sets
       FROM set_logs s
       JOIN exercises e ON e.id = s.exercise_id
       GROUP BY s.exercise_id
       ORDER BY sets DESC
       LIMIT 8`
    )
    .all() as Array<{ exercise_id: number; name: string; sets: number }>;

  return {
    totalSessions,
    sessionsLast30Days,
    totalSets: totals.sets,
    totalVolume: Math.round(totals.volume),
    volumeByWeek,
    topExercises,
  };
}
