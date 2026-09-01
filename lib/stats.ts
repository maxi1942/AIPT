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

export interface CardioHistoryPoint {
  session_id: number;
  date: string;
  duration_seconds: number;
  distance_km: number;
  avg_hr: number | null;
  efforts: number;
}

/** Per-session cardio summary for one exercise, oldest first. */
export function getCardioHistory(
  exerciseId: number,
  limit = 20
): CardioHistoryPoint[] {
  const db = getDb();
  const points = db
    .prepare(
      `SELECT s.session_id, MIN(w.started_at) AS date,
              COALESCE(SUM(s.duration_seconds), 0) AS duration_seconds,
              COALESCE(SUM(s.distance_km), 0) AS distance_km,
              CAST(ROUND(AVG(s.avg_hr)) AS INTEGER) AS avg_hr,
              COUNT(*) AS efforts
       FROM set_logs s
       JOIN workout_sessions w ON w.id = s.session_id
       WHERE s.exercise_id = ? AND (s.duration_seconds IS NOT NULL OR s.distance_km IS NOT NULL)
       GROUP BY s.session_id
       ORDER BY date ASC`
    )
    .all(exerciseId) as CardioHistoryPoint[];
  return points.slice(-limit);
}

export interface OverviewStats {
  totalSessions: number;
  sessionsLast30Days: number;
  totalSets: number;
  totalVolume: number;
  cardioMinutesLast30Days: number;
  cardioKmLast30Days: number;
  volumeByWeek: Array<{ week: string; volume: number }>;
  cardioMinutesByWeek: Array<{ week: string; minutes: number }>;
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

  const cardio30 = db
    .prepare(
      `SELECT COALESCE(SUM(s.duration_seconds), 0) AS seconds,
              COALESCE(SUM(s.distance_km), 0) AS km
       FROM set_logs s
       JOIN workout_sessions w ON w.id = s.session_id
       WHERE w.started_at >= datetime('now', '-30 days')
         AND (s.duration_seconds IS NOT NULL OR s.distance_km IS NOT NULL)`
    )
    .get() as { seconds: number; km: number };

  const cardioMinutesByWeek = db
    .prepare(
      `SELECT strftime('%Y-%W', w.started_at) AS week,
              ROUND(SUM(s.duration_seconds) / 60.0) AS minutes
       FROM set_logs s
       JOIN workout_sessions w ON w.id = s.session_id
       WHERE w.started_at >= datetime('now', '-84 days')
         AND s.duration_seconds IS NOT NULL
       GROUP BY week
       ORDER BY week ASC`
    )
    .all() as Array<{ week: string; minutes: number }>;

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
    cardioMinutesLast30Days: Math.round(cardio30.seconds / 60),
    cardioKmLast30Days: Math.round(cardio30.km * 10) / 10,
    volumeByWeek,
    cardioMinutesByWeek,
    topExercises,
  };
}
