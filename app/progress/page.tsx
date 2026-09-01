import { getDb } from "@/lib/db";
import { getOverviewStats } from "@/lib/stats";
import StatsView from "@/components/StatsView";

export const dynamic = "force-dynamic";

export default function ProgressPage() {
  const stats = getOverviewStats();
  const db = getDb();
  const exerciseOptions = db
    .prepare(
      `SELECT s.exercise_id, e.name, e.kind, COUNT(*) AS sets
       FROM set_logs s
       JOIN exercises e ON e.id = s.exercise_id
       GROUP BY s.exercise_id
       ORDER BY e.name ASC`
    )
    .all() as Array<{
    exercise_id: number;
    name: string;
    sets: number;
    kind: "strength" | "cardio";
  }>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Progress</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Everything you&apos;ve logged, aggregated: weekly volume and
          per-exercise progression.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Tile label="Workouts completed" value={stats.totalSessions} />
        <Tile label="Last 30 days" value={stats.sessionsLast30Days} />
        <Tile label="Total sets" value={stats.totalSets} />
        <Tile
          label="Total volume"
          value={`${stats.totalVolume.toLocaleString()} kg`}
        />
        <Tile
          label="Cardio (30 days)"
          value={`${stats.cardioMinutesLast30Days} min`}
        />
        <Tile
          label="Distance (30 days)"
          value={`${stats.cardioKmLast30Days} km`}
        />
      </div>

      <StatsView overview={stats} exerciseOptions={exerciseOptions} />
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
