"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ExerciseGuideModal from "./ExerciseGuideModal";
import type {
  Exercise,
  SessionDetail,
  SessionExercise,
  SetLog,
} from "@/lib/types";

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
}

interface CoachEvent {
  nonce: number;
  setId: number;
}

export default function WorkoutLive({ sessionId }: { sessionId: number }) {
  const router = useRouter();
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [swapTarget, setSwapTarget] = useState<SessionExercise | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [coachEvent, setCoachEvent] = useState<CoachEvent | null>(null);

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

  // Planned exercises plus any orphaned ones (logged, then removed from plan).
  const cards = useMemo(() => {
    if (!detail) return [];
    const seen = new Set<number>();
    const list: Array<{
      exerciseId: number;
      name: string;
      planned?: SessionExercise;
    }> = [];
    for (const se of detail.sessionExercises) {
      seen.add(se.exercise_id);
      list.push({
        exerciseId: se.exercise_id,
        name: se.exercise_name ?? "Exercise",
        planned: se,
      });
    }
    for (const s of detail.sets) {
      if (seen.has(s.exercise_id)) continue;
      seen.add(s.exercise_id);
      list.push({
        exerciseId: s.exercise_id,
        name: s.exercise_name ?? "Exercise",
      });
    }
    return list;
  }, [detail]);

  async function logSet(exerciseId: number, reps: number, weight: number, rpe: string) {
    const res = await fetch(`/api/sessions/${sessionId}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercise_id: exerciseId, reps, weight, rpe }),
    });
    if (res.ok) {
      const set: SetLog = await res.json();
      await load();
      // Nudge the PT for instant feedback on the set that was just logged.
      setCoachEvent({ nonce: Date.now(), setId: set.id });
    }
    return res.ok;
  }

  async function deleteSet(setId: number) {
    await fetch(`/api/sessions/${sessionId}/sets?setId=${setId}`, {
      method: "DELETE",
    });
    await load();
  }

  async function addExercise(exerciseId: number) {
    await fetch(`/api/sessions/${sessionId}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercise_id: exerciseId }),
    });
    setShowAdd(false);
    await load();
  }

  async function swapExercise(rowId: number, newExerciseId: number) {
    await fetch(`/api/sessions/${sessionId}/exercises`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rowId, exercise_id: newExerciseId }),
    });
    setSwapTarget(null);
    await load();
  }

  async function moveExercise(rowId: number, direction: -1 | 1) {
    await fetch(`/api/sessions/${sessionId}/exercises`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rowId, direction }),
    });
    await load();
  }

  async function removeExercise(row: SessionExercise) {
    const logged = setsByExercise.get(row.exercise_id)?.length ?? 0;
    if (
      logged > 0 &&
      !confirm("You already logged sets for this exercise — they stay in the session log. Remove it from the plan anyway?")
    )
      return;
    await fetch(`/api/sessions/${sessionId}/exercises?id=${row.id}`, {
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

  const finished = !!detail.session.finished_at;
  const usedExerciseIds = new Set(cards.map((c) => c.exerciseId));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* The PT leads: first on mobile, right-hand column on desktop. */}
      <div className="lg:order-2">
        <TrainerChat
          sessionId={sessionId}
          finished={finished}
          initialChat={detail.chat.map((m) => ({
            role: m.role,
            content: m.content,
          }))}
          coachEvent={coachEvent}
        />
      </div>

      <div className="space-y-4 lg:order-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{detail.session.name}</h1>
            <ElapsedTimer startedAt={detail.session.started_at} />
          </div>
          <button
            onClick={finishWorkout}
            disabled={finishing || finished}
            className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 disabled:opacity-50"
          >
            {finished
              ? "Workout finished"
              : finishing
                ? "Finishing…"
                : "Finish workout"}
          </button>
        </div>

        {cards.map((card, i) => (
          <ExerciseCard
            key={card.planned?.id ?? `orphan-${card.exerciseId}`}
            name={card.name}
            planned={card.planned}
            isFirst={i === 0}
            isLast={i === cards.length - 1}
            sets={setsByExercise.get(card.exerciseId) ?? []}
            onLog={(reps, weight, rpe) =>
              logSet(card.exerciseId, reps, weight, rpe)
            }
            onDeleteSet={deleteSet}
            onSwap={card.planned ? () => setSwapTarget(card.planned!) : undefined}
            onMove={
              card.planned
                ? (dir) => moveExercise(card.planned!.id, dir)
                : undefined
            }
            onRemove={
              card.planned ? () => removeExercise(card.planned!) : undefined
            }
            readOnly={finished}
          />
        ))}

        {!finished && (
          <div className="rounded-lg border border-dashed border-zinc-700 p-4">
            {showAdd ? (
              <ExercisePicker
                library={library}
                exclude={usedExerciseIds}
                onPick={(e) => addExercise(e.id)}
                onCancel={() => setShowAdd(false)}
                placeholder="Search exercises to add…"
              />
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

      {swapTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
          onClick={() => setSwapTarget(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl border border-zinc-700 bg-zinc-900 p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 font-semibold">
              Swap {swapTarget.exercise_name} for…
            </h2>
            <ExercisePicker
              library={library}
              exclude={usedExerciseIds}
              onPick={(e) => swapExercise(swapTarget.id, e.id)}
              onCancel={() => setSwapTarget(null)}
              placeholder="Search a replacement…"
              autoFocus
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ExercisePicker({
  library,
  exclude,
  onPick,
  onCancel,
  placeholder,
  autoFocus = true,
}: {
  library: Exercise[];
  exclude: Set<number>;
  onPick: (exercise: Exercise) => void;
  onCancel: () => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const [filter, setFilter] = useState("");
  const [guideFor, setGuideFor] = useState<string | null>(null);

  const groups = ["", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full Body"];
  const [group, setGroup] = useState("");

  const candidates = library.filter(
    (e) =>
      !exclude.has(e.id) &&
      (group === "" || e.muscle_group === group) &&
      (filter === "" ||
        e.name.toLowerCase().includes(filter.toLowerCase()) ||
        e.muscle_group.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div>
      <div className="flex gap-2">
        <input
          autoFocus={autoFocus}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={placeholder}
          className="grow rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
        />
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-emerald-400"
        >
          {groups.map((g) => (
            <option key={g} value={g}>
              {g === "" ? "All muscles" : g}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 max-h-56 overflow-y-auto">
        {candidates.slice(0, 30).map((e) => (
          <div
            key={e.id}
            className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-zinc-800"
          >
            <button onClick={() => onPick(e)} className="grow text-left">
              {e.name}
              <span className="ml-2 text-xs text-zinc-500">
                {e.muscle_group} · {e.equipment}
              </span>
            </button>
            <button
              onClick={() => setGuideFor(e.name)}
              className="ml-2 shrink-0 rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:border-emerald-400/60 hover:text-emerald-300"
              title={`How to perform ${e.name}`}
            >
              ?
            </button>
          </div>
        ))}
        {candidates.length === 0 && (
          <div className="px-3 py-2 text-sm text-zinc-500">No matches.</div>
        )}
      </div>
      <button
        onClick={onCancel}
        className="mt-2 text-sm text-zinc-400 hover:text-zinc-200"
      >
        Cancel
      </button>
      {guideFor && (
        <ExerciseGuideModal
          exerciseName={guideFor}
          onClose={() => setGuideFor(null)}
        />
      )}
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
  planned,
  sets,
  isFirst,
  isLast,
  onLog,
  onDeleteSet,
  onSwap,
  onMove,
  onRemove,
  readOnly,
}: {
  name: string;
  planned?: SessionExercise;
  sets: SetLog[];
  isFirst: boolean;
  isLast: boolean;
  onLog: (reps: number, weight: number, rpe: string) => Promise<boolean>;
  onDeleteSet: (setId: number) => void;
  onSwap?: () => void;
  onMove?: (direction: -1 | 1) => void;
  onRemove?: () => void;
  readOnly: boolean;
}) {
  const lastSet = sets[sets.length - 1];
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [rpe, setRpe] = useState("");
  const [busy, setBusy] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  async function submit() {
    const repsNum = Number(reps);
    const weightNum = weight === "" ? 0 : Number(weight);
    if (!repsNum || repsNum <= 0) return;
    setBusy(true);
    const ok = await onLog(repsNum, weightNum, rpe);
    setBusy(false);
    if (ok) setRpe("");
  }

  const done = planned ? sets.length >= planned.target_sets : false;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2 font-semibold">
            {name}
            <button
              onClick={() => setShowGuide(true)}
              className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs font-medium text-zinc-400 transition hover:border-emerald-400/60 hover:text-emerald-300"
              title={`How to perform ${name}`}
            >
              How to
            </button>
            {done && <span className="text-sm text-emerald-300">✓</span>}
          </div>
          {planned && (
            <div className="text-xs text-zinc-400">
              Target: {planned.target_sets} × {planned.target_reps}
              {planned.target_weight != null
                ? ` @ ${planned.target_weight} kg`
                : ""}{" "}
              · rest {planned.rest_seconds}s
              {planned.notes ? ` · ${planned.notes}` : ""}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-sm text-zinc-400">
            {sets.length}
            {planned ? `/${planned.target_sets}` : ""} sets
          </span>
          {!readOnly && onMove && (
            <>
              <button
                onClick={() => onMove(-1)}
                disabled={isFirst}
                className="rounded px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                onClick={() => onMove(1)}
                disabled={isLast}
                className="rounded px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
                aria-label="Move down"
              >
                ↓
              </button>
            </>
          )}
          {!readOnly && onSwap && (
            <button
              onClick={onSwap}
              className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:border-emerald-400/60 hover:text-emerald-300"
              title="Swap for another exercise"
            >
              ⇄ Swap
            </button>
          )}
          {!readOnly && onRemove && (
            <button
              onClick={onRemove}
              className="rounded px-1.5 py-0.5 text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
              aria-label="Remove exercise"
              title="Remove from this session"
            >
              ✕
            </button>
          )}
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

      {showGuide && (
        <ExerciseGuideModal
          exerciseName={name}
          onClose={() => setShowGuide(false)}
        />
      )}
    </div>
  );
}

const QUICK_REPLIES = ["That felt easy", "That felt hard", "What's next?"];

function TrainerChat({
  sessionId,
  initialChat,
  finished,
  coachEvent,
}: {
  sessionId: number;
  initialChat: ChatEntry[];
  finished: boolean;
  coachEvent: CoachEvent | null;
}) {
  const [messages, setMessages] = useState<ChatEntry[]>(initialChat);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);
  const streamingRef = useRef(false);
  const handledEventRef = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const runStream = useCallback(
    async (payload: Record<string, unknown>, showUserBubble?: string) => {
      if (streamingRef.current) return;
      streamingRef.current = true;
      setStreaming(true);
      setMessages((prev) => [
        ...prev,
        ...(showUserBubble
          ? [{ role: "user" as const, content: showUserBubble }]
          : []),
        { role: "assistant", content: "" },
      ]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, ...payload }),
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
        streamingRef.current = false;
        setStreaming(false);
      }
    },
    [sessionId]
  );

  // The PT opens the session like a real trainer would.
  useEffect(() => {
    if (finished || greetedRef.current || initialChat.length > 0) return;
    greetedRef.current = true;
    runStream({ event: "session_start" });
  }, [finished, initialChat.length, runStream]);

  // Instant reaction each time a set is logged.
  useEffect(() => {
    if (!coachEvent || finished) return;
    if (coachEvent.nonce === handledEventRef.current) return;
    handledEventRef.current = coachEvent.nonce;
    runStream({ event: "set_logged", set_id: coachEvent.setId });
  }, [coachEvent, finished, runStream]);

  function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput("");
    runStream({ message: content }, content);
  }

  return (
    <div className="flex h-[46vh] min-h-[340px] flex-col rounded-lg border border-zinc-800 bg-zinc-900 lg:sticky lg:top-20 lg:h-[calc(100vh-8rem)]">
      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-2 w-2 rounded-full ${streaming ? "animate-pulse bg-emerald-300" : "bg-emerald-400"}`}
          />
          <h2 className="text-sm font-semibold">AI Trainer</h2>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">
          Live coaching from your plan, today&apos;s sets, and your history.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && !streaming && (
          <p className="text-sm text-zinc-400">
            Your trainer is warming up — ask anything, or just log your first
            set.
          </p>
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
            <div className="whitespace-pre-wrap">
              {m.content ||
                (streaming && i === messages.length - 1 ? (
                  <span className="text-zinc-500">…</span>
                ) : (
                  ""
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-800 p-3">
        {!finished && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={streaming}
                className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-emerald-400/60 hover:text-white disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>
        )}
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
