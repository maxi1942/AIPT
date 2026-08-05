import Link from "next/link";
import { getDb } from "@/lib/db";
import type { WorkoutSession } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = WorkoutSession & {
  template_name: string | null;
  set_count: number;
  total_volume: number;
  exercise_count: number;
};

export default function HistoryPage() {
  const db = getDb();
  const sessions = db
    .prepare(
      `SELECT w.*, t.name AS template_name,
              COUNT(s.id) AS set_count,
              COUNT(DISTINCT s.exercise_id) AS exercise_count,
              COALESCE(ROUND(SUM(s.reps * s.weight)), 0) AS total_volume
       FROM workout_sessions w
       LEFT JOIN templates t ON t.id = w.template_id
       LEFT JOIN set_logs s ON s.session_id = w.id
       GROUP BY w.id
       ORDER BY w.started_at DESC`
    )
    .all() as Row[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Every session you&apos;ve logged, newest first.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 p-10 text-center text-zinc-400">
          No sessions yet — start a workout from the dashboard.
        </div>
      ) : (
        <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-900">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/history/${s.id}`}
              className="flex items-center justify-between px-4 py-3 transition hover:bg-zinc-800/50"
            >
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {s.name}
                  {!s.finished_at && (
                    <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-300">
                      in progress
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-zinc-400">
                  {s.started_at.slice(0, 16).replace("T", " ")} UTC
                </div>
              </div>
              <div className="text-right text-xs tabular-nums text-zinc-400">
                <div>
                  {s.exercise_count} exercises · {s.set_count} sets
                </div>
                <div>{s.total_volume.toLocaleString()} kg volume</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
