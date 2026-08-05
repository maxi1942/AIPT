"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Exercise,
  SessionDetail,
  SetLog,
  TemplateExercise,
} from "@/lib/types";

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
}

export default function WorkoutLive({ sessionId }: { sessionId: number }) {
  const router = useRouter();
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [extraExerciseIds, setExtraExerciseIds] = useState<number[]>([]);
  const [addFilter, setAddFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (!res.ok) {
      setLoadError("Could not load this workout session.");
      return;
    }
    const data: SessionDetail = await res.json();
    setDetail(data);
  }, [sessionId]);

  useEffect(() => {
    load();
    fetch("/api/exercises")
      .then((r) => r.json())
      .then(setLibrary)
      .catch(() => {});
  }, [load]);

  const setsByExercise = useMemo(() => {
    const map = new Map<number, SetLog[]>();
    for (const s of detail?.sets ?? []) {
      const list = map.get(s.exercise_id) ?? [];
      list.push(s);
      map.set(s.exercise_id, list);
    }
    return map;
  }, [detail]);

  // Exercises shown as cards: planned ones first, then anything logged or
  // added ad hoc during the session.
  const cards = useMemo(() => {
    if (!detail) return [];
    const seen = new Set<number>();
    const list: Array<{
      exerciseId: number;
      name: string;
      target?: TemplateExercise;
    }> = [];
    for (const te of detail.templateExercises) {
      seen.add(te.exercise_id);
      list.push({
        exerciseId: te.exercise_id,
        name: te.exercise_name ?? "Exercise",
        target: te,
      });
    }
    const extras = new Set<number>(extraExerciseIds);
    for (const s of detail.sets) extras.add(s.exercise_id);
    for (const id of extras) {
      if (seen.has(id)) continue;
      seen.add(id);
      const name =
        detail.sets.find((s) => s.exercise_id === id)?.exercise_name ??
        library.find((e) => e.id === id)?.name ??
        "Exercise";
      list.push({ exerciseId: id, name });
    }
    return list;
  }, [detail, extraExerciseIds, library]);

  async function logSet(exerciseId: number, reps: number, weight: number, rpe: string) {
    const res = await fetch(`/api/sessions/${sessionId}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercise_id: exerciseId, reps, weight, rpe }),
    });
    if (res.ok) await load();
    return res.ok;
  }

  async function deleteSet(setId: number) {
    await fetch(`/api/sessions/${sessionId}/sets?setId=${setId}`, {
      method: "DELETE",
    });
    await load();
  }

  async function finishWorkout() {
    if (!confirm("Finish this workout?")) return;
    setFinishing(true);
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finish: true }),
    });
    router.push(`/history/${sessionId}`);
  }

  if (loadError) {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">
        {loadError}
      </div>
    );
  }
  if (!detail) {
    return <div className="py-20 text-center text-zinc-500">Loading…</div>;
  }

  const addCandidates = library.filter(
    (e) =>
      !cards.some((c) => c.exerciseId === e.id) &&
      (addFilter === "" ||
        e.name.toLowerCase().includes(addFilter.toLowerCase()) ||
        e.muscle_group.toLowerCase().includes(addFilter.toLowerCase()))
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{detail.session.name}</h1>
            <ElapsedTimer startedAt={detail.session.started_at} />
          </div>
          <button
            onClick={finishWorkout}
            disabled={finishing || !!detail.session.finished_at}
            className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 disabled:opacity-50"
          >
            {detail.session.finished_at
              ? "Workout finished"
              : finishing
                ? "Finishing…"
                : "Finish workout"}
          </button>
        </div>

        {cards.map((card) => (
          <ExerciseCard
            key={card.exerciseId}
            name={card.name}
            target={card.target}
            sets={setsByExercise.get(card.exerciseId) ?? []}
            onLog={(reps, weight, rpe) =>
              logSet(card.exerciseId, reps, weight, rpe)
            }
            onDeleteSet={deleteSet}
            readOnly={!!detail.session.finished_at}
          />
        ))}

        {!detail.session.finished_at && (
          <div className="rounded-lg border border-dashed border-zinc-700 p-4">
            {showAdd ? (
              <div>
                <input
                  autoFocus
                  value={addFilter}
                  onChange={(e) => setAddFilter(e.target.value)}
                  placeholder="Search exercises to add…"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                />
                <div className="mt-2 max-h-48 overflow-y-auto">
                  {addCandidates.slice(0, 15).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        setExtraExerciseIds((prev) => [...prev, e.id]);
                        setShowAdd(false);
                        setAddFilter("");
                      }}
                      className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-zinc-800"
                    >
                      <span>{e.name}</span>
                      <span className="text-xs text-zinc-500">
                        {e.muscle_group}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowAdd(false)}
                  className="mt-2 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="w-full text-sm text-emerald-300 hover:text-emerald-200"
              >
                + Add another exercise
              </button>
            )}
          </div>
        )}
      </div>

      <TrainerChat
        sessionId={sessionId}
        initialChat={detail.chat.map((m) => ({
          role: m.role,
          content: m.content,
        }))}
      />
    </div>
  );
}

function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // SQLite datetime('now') is UTC without a zone marker.
  const start = new Date(startedAt.replace(" ", "T") + "Z").getTime();
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return (
    <div className="text-sm tabular-nums text-zinc-400">
      Elapsed: {h > 0 ? `${h}:` : ""}
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </div>
  );
}

function ExerciseCard({
  name,
  target,
  sets,
  onLog,
  onDeleteSet,
  readOnly,
}: {
  name: string;
  target?: TemplateExercise;
  sets: SetLog[];
  onLog: (reps: number, weight: number, rpe: string) => Promise<boolean>;
  onDeleteSet: (setId: number) => void;
  readOnly: boolean;
}) {
  const lastSet = sets[sets.length - 1];
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [rpe, setRpe] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const repsNum = Number(reps);
    const weightNum = weight === "" ? 0 : Number(weight);
    if (!repsNum || repsNum <= 0) return;
    setBusy(true);
    const ok = await onLog(repsNum, weightNum, rpe);
    setBusy(false);
    if (ok) setRpe("");
  }

  const done = target ? sets.length >= target.target_sets : false;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">
            {name}
            {done && <span className="ml-2 text-sm text-emerald-300">✓</span>}
          </div>
          {target && (
            <div className="text-xs text-zinc-400">
              Target: {target.target_sets} × {target.target_reps}
              {target.target_weight != null
                ? ` @ ${target.target_weight} kg`
                : ""}{" "}
              · rest {target.rest_seconds}s
              {target.notes ? ` · ${target.notes}` : ""}
            </div>
          )}
        </div>
        <div className="text-sm text-zinc-400">
          {sets.length}
          {target ? `/${target.target_sets}` : ""} sets
        </div>
      </div>

      {sets.length > 0 && (
        <div className="mt-3 space-y-1">
          {sets.map((s) => (
            <div
              key={s.id}
              className="group flex items-center justify-between rounded bg-zinc-950/60 px-3 py-1.5 text-sm tabular-nums"
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
              {!readOnly && (
                <button
                  onClick={() => onDeleteSet(s.id)}
                  className="text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                  aria-label="Delete set"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Reps</label>
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder={lastSet ? String(lastSet.reps) : "8"}
              className="w-20 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">
              Weight (kg)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={lastSet ? String(lastSet.weight) : "0"}
              className="w-24 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">
              RPE <span className="text-zinc-600">(opt.)</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              max={10}
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              placeholder="—"
              className="w-16 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm outline-none focus:border-emerald-400"
            />
          </div>
          <button
            onClick={submit}
            disabled={busy || !reps}
            className="rounded-md bg-zinc-100 px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-white disabled:opacity-40"
          >
            {busy ? "…" : "Log set"}
          </button>
        </div>
      )}
    </div>
  );
}

const SUGGESTIONS = [
  "How am I doing compared to last time?",
  "What weight should I use for my next set?",
  "I'm feeling tired — should I cut it short?",
];

function TrainerChat({
  sessionId,
  initialChat,
}: {
  sessionId: number;
  initialChat: ChatEntry[];
}) {
  const [messages, setMessages] = useState<ChatEntry[]>(initialChat);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: content }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: data.error ?? "The trainer is unavailable right now.",
          };
          return next;
        });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let assistantText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        const snapshot = assistantText;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: snapshot };
          return next;
        });
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "Connection lost — please try again.",
        };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[420px] flex-col rounded-lg border border-zinc-800 bg-zinc-900 lg:sticky lg:top-20">
      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          <h2 className="text-sm font-semibold">AI Trainer</h2>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">
          Knows your plan, today&apos;s sets, and your history.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-zinc-400">
              Ask me anything mid-workout. For example:
            </p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full rounded-md border border-zinc-700 px-3 py-2 text-left text-sm text-zinc-300 hover:border-emerald-400/60 hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-6 rounded-lg bg-emerald-400/15 px-3 py-2 text-sm"
                : "mr-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm"
            }
          >
            {m.content ||
              (streaming && i === messages.length - 1 ? (
                <span className="text-zinc-500">Thinking…</span>
              ) : (
                ""
              ))}
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-800 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your trainer…"
            disabled={streaming}
            className="grow rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
