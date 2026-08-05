import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { estimateOneRepMax } from "@/lib/types";
import type { ChatMessage, SetLog, WorkoutSession } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const session = db
    .prepare("SELECT * FROM workout_sessions WHERE id = ?")
    .get(id) as WorkoutSession | undefined;
  if (!session) notFound();

  const sets = db
    .prepare(
      `SELECT s.*, e.name AS exercise_name
       FROM set_logs s JOIN exercises e ON e.id = s.exercise_id
       WHERE s.session_id = ? ORDER BY s.logged_at ASC, s.id ASC`
    )
    .all(id) as SetLog[];

  const chat = db
    .prepare(
      "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC, id ASC"
    )
    .all(id) as ChatMessage[];

  const byExercise = new Map<string, SetLog[]>();
  for (const s of sets) {
    const key = s.exercise_name ?? String(s.exercise_id);
    const list = byExercise.get(key) ?? [];
    list.push(s);
    byExercise.set(key, list);
  }

  const totalVolume = Math.round(
    sets.reduce((acc, s) => acc + s.reps * s.weight, 0)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{session.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {session.started_at.slice(0, 16).replace("T", " ")} UTC
            {session.finished_at ? "" : " · still in progress"}
          </p>
        </div>
        {!session.finished_at && (
          <Link
            href={`/workout/${session.id}`}
            className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-300"
          >
            Resume workout
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Tile label="Exercises" value={byExercise.size} />
        <Tile label="Sets" value={sets.length} />
        <Tile label="Volume" value={`${totalVolume.toLocaleString()} kg`} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Sets</h2>
        {byExercise.size === 0 && (
          <p className="text-sm text-zinc-400">No sets were logged.</p>
        )}
        {[...byExercise.entries()].map(([name, list]) => {
          const best = list.reduce(
            (acc, s) => {
              const est = estimateOneRepMax(s.weight, s.reps);
              return est > acc.est ? { est, s } : acc;
            },
            { est: 0, s: null as SetLog | null }
          );
          return (
            <div
              key={name}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{name}</div>
                {best.s && best.est > 0 && (
                  <div className="text-xs text-zinc-400">
                    Best set: {best.s.reps} × {best.s.weight} kg (est. 1RM{" "}
                    {Math.round(best.est * 10) / 10} kg)
                  </div>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {list.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded bg-zinc-950/60 px-3 py-1.5 text-sm tabular-nums"
                  >
                    <span className="text-zinc-400">Set {s.set_number}</span>
                    <span>
                      {s.reps} reps × {s.weight} kg
                      {s.rpe != null && (
                        <span className="ml-2 text-xs text-zinc-500">
                          RPE {s.rpe}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {chat.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Trainer chat transcript</h2>
          <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            {chat.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-8 rounded-lg bg-emerald-400/15 px-3 py-2 text-sm"
                    : "mr-4 rounded-lg bg-zinc-800 px-3 py-2 text-sm"
                }
              >
                <div className="mb-0.5 text-xs text-zinc-500">
                  {m.role === "user" ? "You" : "Trainer"}
                </div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
