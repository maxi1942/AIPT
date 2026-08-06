import Link from "next/link";
import { getDb } from "@/lib/db";
import { getOverviewStats } from "@/lib/stats";
import StartWorkoutButton from "@/components/StartWorkoutButton";
import type { Template, WorkoutSession } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const db = getDb();
  const stats = getOverviewStats();

  const activeSession = db
    .prepare(
      "SELECT * FROM workout_sessions WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1"
    )
    .get() as WorkoutSession | undefined;

  const hasProfile = !!db
    .prepare("SELECT id FROM user_profile WHERE id = 1")
    .get();

  const templates = db
    .prepare(
      `SELECT t.*, COUNT(te.id) AS exercise_count
       FROM templates t
       LEFT JOIN template_exercises te ON te.template_id = t.id
       GROUP BY t.id
       ORDER BY t.created_at DESC
       LIMIT 6`
    )
    .all() as Template[];

  const recentSessions = db
    .prepare(
      `SELECT w.*, COUNT(s.id) AS set_count,
              COALESCE(ROUND(SUM(s.reps * s.weight)), 0) AS total_volume
       FROM workout_sessions w
       LEFT JOIN set_logs s ON s.session_id = w.id
       WHERE w.finished_at IS NOT NULL
       GROUP BY w.id
       ORDER BY w.started_at DESC
       LIMIT 5`
    )
    .all() as Array<WorkoutSession & { set_count: number; total_volume: number }>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Design a workout, start training, and let your AI trainer push you
          forward.
        </p>
      </div>

      {!hasProfile && (
        <Link
          href="/profile"
          className="flex items-center justify-between rounded-lg border border-sky-400/40 bg-sky-400/10 px-4 py-3 transition hover:bg-sky-400/20"
        >
          <div>
            <div className="text-sm font-semibold text-sky-300">
              Set up your profile
            </div>
            <div className="text-sm text-zinc-300">
              Pick your goal and schedule — AIPT generates your weekly plan and
              tailors the AI trainer to you.
            </div>
          </div>
          <span className="text-sm font-semibold text-sky-300">Start →</span>
        </Link>
      )}

      {activeSession && (
        <Link
          href={`/workout/${activeSession.id}`}
          className="flex items-center justify-between rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 transition hover:bg-emerald-400/20"
        >
          <div>
            <div className="text-sm font-semibold text-emerald-300">
              Workout in progress
            </div>
            <div className="text-sm text-zinc-300">{activeSession.name}</div>
          </div>
          <span className="text-sm font-semibold text-emerald-300">
            Resume →
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Workouts (30 days)" value={stats.sessionsLast30Days} />
        <StatTile label="Workouts total" value={stats.totalSessions} />
        <StatTile label="Sets logged" value={stats.totalSets} />
        <StatTile
          label="Volume lifted"
          value={`${formatVolume(stats.totalVolume)} kg`}
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your workouts</h2>
          <Link
            href="/templates/new"
            className="text-sm font-medium text-emerald-300 hover:text-emerald-200"
          >
            + New workout
          </Link>
        </div>
        {templates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center">
            <p className="text-zinc-400">
              No workouts yet. Design your first one to get started.
            </p>
            <Link
              href="/templates/new"
              className="mt-4 inline-block rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-300"
            >
              Design a workout
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-4"
              >
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {t.exercise_count} exercise
                    {t.exercise_count === 1 ? "" : "s"}
                  </div>
                  {t.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                      {t.description}
                    </p>
                  )}
                </div>
                <div className="mt-4">
                  <StartWorkoutButton templateId={t.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent sessions</h2>
          <Link
            href="/history"
            className="text-sm font-medium text-emerald-300 hover:text-emerald-200"
          >
            View all
          </Link>
        </div>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Nothing logged yet — your finished workouts will show up here.
          </p>
        ) : (
          <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-900">
            {recentSessions.map((s) => (
              <Link
                key={s.id}
                href={`/history/${s.id}`}
                className="flex items-center justify-between px-4 py-3 transition hover:bg-zinc-800/50"
              >
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-zinc-400">
                    {s.started_at.slice(0, 10)}
                  </div>
                </div>
                <div className="text-right text-xs text-zinc-400">
                  <div>{s.set_count} sets</div>
                  <div>{formatVolume(s.total_volume)} kg</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1000)}k`;
  return String(v);
}
