"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ExerciseGuideModal from "./ExerciseGuideModal";
import { cardioEffortStr, zoneLabel } from "@/lib/cardio";
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
  const [expandOverride, setExpandOverride] = useState<Record<string, boolean>>({});

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

  async function logSet(exerciseId: number, payload: Record<string, unknown>) {
    const res = await fetch(`/api/sessions/${sessionId}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercise_id: exerciseId, ...payload }),
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
      <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-700">
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
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {finished
              ? "Workout finished"
              : finishing
                ? "Finishing…"
                : "Finish workout"}
          </button>
        </div>

        {(() => {
          const doneFlags = cards.map(
            (card) =>
              !!card.planned &&
              (setsByExercise.get(card.exerciseId)?.length ?? 0) >=
                card.planned.target_sets
          );
          const currentIndex = doneFlags.findIndex((d) => !d);
          return cards.map((card, i) => {
            const key = card.planned
              ? String(card.planned.id)
              : `orphan-${card.exerciseId}`;
            const status: CardStatus = doneFlags[i]
              ? "done"
              : i === currentIndex
                ? "active"
                : "upcoming";
            const expanded = finished
              ? true
              : (expandOverride[key] ?? status === "active");
            const isCardio =
              card.planned?.exercise_kind === "cardio" ||
              library.find((e) => e.id === card.exerciseId)?.kind === "cardio";
            return (
              <ExerciseCard
                key={key}
                name={card.name}
                planned={card.planned}
                isCardio={isCardio}
                isFirst={i === 0}
                isLast={i === cards.length - 1}
                status={status}
                expanded={expanded}
                onToggle={() =>
                  setExpandOverride((prev) => ({ ...prev, [key]: !expanded }))
                }
                sets={setsByExercise.get(card.exerciseId) ?? []}
                onLog={(payload) => logSet(card.exerciseId, payload)}
                onDeleteSet={deleteSet}
                onSwap={
                  card.planned ? () => setSwapTarget(card.planned!) : undefined
                }
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
            );
          });
        })()}

        {!finished && (
          <div className="rounded-lg border border-dashed border-zinc-300 p-4">
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
                className="w-full text-sm text-blue-700 hover:text-blue-600"
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
            className="w-full max-w-lg rounded-t-2xl border border-zinc-300 bg-white p-5 sm:rounded-2xl"
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

  const groups = ["", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full Body", "Cardio"];
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
          className="grow rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm outline-none focus:border-blue-500"
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
            className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-zinc-100"
          >
            <button onClick={() => onPick(e)} className="grow text-left">
              {e.name}
              <span className="ml-2 text-xs text-zinc-500">
                {e.muscle_group} · {e.equipment}
              </span>
            </button>
            <button
              onClick={() => setGuideFor(e.name)}
              className="ml-2 shrink-0 rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-500 hover:border-blue-500/60 hover:text-blue-600"
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
        className="mt-2 text-sm text-zinc-500 hover:text-zinc-800"
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
    <div className="text-sm tabular-nums text-zinc-500">
      Elapsed: {h > 0 ? `${h}:` : ""}
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </div>
  );
}

type CardStatus = "active" | "upcoming" | "done";

function ExerciseCard({
  name,
  planned,
  isCardio,
  sets,
  isFirst,
  isLast,
  status,
  expanded,
  onToggle,
  onLog,
  onDeleteSet,
  onSwap,
  onMove,
  onRemove,
  readOnly,
}: {
  name: string;
  planned?: SessionExercise;
  isCardio: boolean;
  sets: SetLog[];
  isFirst: boolean;
  isLast: boolean;
  status: CardStatus;
  expanded: boolean;
  onToggle: () => void;
  onLog: (payload: Record<string, unknown>) => Promise<boolean>;
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
  const [durationMin, setDurationMin] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  async function submit() {
    if (isCardio) {
      const dur = durationMin === "" ? null : Number(durationMin);
      const dist = distanceKm === "" ? null : Number(distanceKm);
      if (!dur && !dist) return;
      setBusy(true);
      const ok = await onLog({
        duration_min: dur,
        distance_km: dist,
        avg_hr: avgHr === "" ? null : Number(avgHr),
      });
      setBusy(false);
      if (ok) {
        setDurationMin("");
        setDistanceKm("");
        setAvgHr("");
      }
      return;
    }
    const repsNum = Number(reps);
    const weightNum = weight === "" ? 0 : Number(weight);
    if (!repsNum || repsNum <= 0) return;
    setBusy(true);
    const ok = await onLog({ reps: repsNum, weight: weightNum, rpe });
    setBusy(false);
    if (ok) setRpe("");
  }

  // The current exercise pops; the rest recede until they're up.
  const cardStyle = readOnly
    ? "border-zinc-200 bg-white"
    : status === "active"
      ? "border-blue-500/60 bg-white ring-1 ring-blue-500/25 shadow-sm"
      : status === "done"
        ? "border-zinc-200 bg-zinc-50 opacity-70"
        : "border-zinc-200 bg-white opacity-75";

  return (
    <div className={`rounded-lg border p-4 transition ${cardStyle}`}>
      <div
        className="flex cursor-pointer items-start justify-between gap-2"
        onClick={onToggle}
        role="button"
        aria-expanded={expanded}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2 font-semibold">
            <span className={status === "done" && !readOnly ? "text-zinc-500" : ""}>
              {name}
            </span>
            {!readOnly && status === "active" && (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                Now
              </span>
            )}
            {!readOnly && status === "done" && (
              <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                ✓ Done
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowGuide(true);
              }}
              className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs font-medium text-zinc-500 transition hover:border-blue-500/60 hover:text-blue-600"
              title={`How to perform ${name}`}
            >
              How to
            </button>
          </div>
          {planned && !isCardio && (
            <div className="text-xs text-zinc-500">
              Target: {planned.target_sets} × {planned.target_reps}
              {planned.target_weight != null
                ? ` @ ${planned.target_weight} kg`
                : ""}{" "}
              · rest {planned.rest_seconds}s
              {planned.notes ? ` · ${planned.notes}` : ""}
            </div>
          )}
          {planned && isCardio && (
            <div className="text-xs text-zinc-500">
              Target:{" "}
              {[
                planned.target_duration_min
                  ? `${planned.target_duration_min} min`
                  : null,
                planned.target_distance_km
                  ? `${planned.target_distance_km} km`
                  : null,
                planned.target_zone ? zoneLabel(planned.target_zone) : null,
              ]
                .filter(Boolean)
                .join(" · ") || "free effort"}
              {planned.notes ? ` · ${planned.notes}` : ""}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-sm tabular-nums text-zinc-500">
            {sets.length}
            {planned ? `/${planned.target_sets}` : ""}{" "}
            {isCardio ? "done" : "sets"}
          </span>
          {!readOnly && onMove && expanded && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(-1);
                }}
                disabled={isFirst}
                className="rounded px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-30"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(1);
                }}
                disabled={isLast}
                className="rounded px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-30"
                aria-label="Move down"
              >
                ↓
              </button>
            </>
          )}
          {!readOnly && onSwap && expanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSwap();
              }}
              className="rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-500 hover:border-blue-500/60 hover:text-blue-600"
              title="Swap for another exercise"
            >
              ⇄ Swap
            </button>
          )}
          {!readOnly && onRemove && expanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="rounded px-1.5 py-0.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Remove exercise"
              title="Remove from this session"
            >
              ✕
            </button>
          )}
          <span className="ml-1 text-zinc-400" aria-hidden>
            {expanded ? "▾" : "▸"}
          </span>
        </div>
      </div>

      {expanded && sets.length > 0 && (
        <div className="mt-3 space-y-1">
          {sets.map((s) => (
            <div
              key={s.id}
              className="group flex items-center justify-between rounded bg-zinc-100/80 px-3 py-1.5 text-sm tabular-nums"
            >
              <span className="text-zinc-500">
                {s.duration_seconds != null || s.distance_km != null
                  ? `Effort ${s.set_number}`
                  : `Set ${s.set_number}`}
              </span>
              <span>
                {s.duration_seconds != null || s.distance_km != null ? (
                  cardioEffortStr(s)
                ) : (
                  <>
                    {s.reps} reps × {s.weight} kg
                    {s.rpe != null && (
                      <span className="ml-2 text-xs text-zinc-500">
                        RPE {s.rpe}
                      </span>
                    )}
                  </>
                )}
              </span>
              {!readOnly && (
                <button
                  onClick={() => onDeleteSet(s.id)}
                  className="text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:text-red-600"
                  aria-label="Delete set"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {expanded && !readOnly && isCardio && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Time (min)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              placeholder={
                planned?.target_duration_min
                  ? String(planned.target_duration_min)
                  : "20"
              }
              className="w-24 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Distance (km) <span className="text-zinc-400">(opt.)</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              placeholder="—"
              className="w-28 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Avg HR <span className="text-zinc-400">(opt.)</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={avgHr}
              onChange={(e) => setAvgHr(e.target.value)}
              placeholder="bpm"
              className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={submit}
            disabled={busy || (!durationMin && !distanceKm)}
            className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-40"
          >
            {busy ? "…" : "Log effort"}
          </button>
        </div>
      )}

      {expanded && !readOnly && !isCardio && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Reps</label>
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder={lastSet ? String(lastSet.reps) : "8"}
              className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Weight (kg)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={lastSet ? String(lastSet.weight) : "0"}
              className="w-24 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              RPE <span className="text-zinc-400">(opt.)</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              max={10}
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              placeholder="—"
              className="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={submit}
            disabled={busy || !reps}
            className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-40"
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
    <div className="flex h-[46vh] min-h-[340px] flex-col rounded-lg border border-zinc-200 bg-white lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)]">
      <div className="border-b border-zinc-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-2 w-2 rounded-full ${streaming ? "animate-pulse bg-blue-500" : "bg-blue-600"}`}
          />
          <h2 className="text-sm font-semibold">AI Trainer</h2>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">
          Live coaching from your plan, today&apos;s sets, and your history.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && !streaming && (
          <p className="text-sm text-zinc-500">
            Your trainer is warming up — ask anything, or just log your first
            set.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-6 rounded-lg bg-blue-100/80 px-3 py-2 text-sm"
                : "mr-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm"
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

      <div className="border-t border-zinc-200 p-3">
        {!finished && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={streaming}
                className="rounded-full border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 transition hover:border-blue-500/60 hover:text-zinc-900 disabled:opacity-40"
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
            className="grow rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
