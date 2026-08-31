"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import ExerciseAnimation from "./ExerciseAnimation";
import ExerciseGuideModal from "./ExerciseGuideModal";
import type { Exercise, TemplateExercise } from "@/lib/types";

const GROUPS = ["", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full Body"];

/**
 * The exercise rows on the workout detail view. Tapping a row opens the
 * exercise library in a bottom sheet to swap that slot for another movement
 * (sets/reps/rest are kept).
 */
export default function TemplateExerciseList({
  templateId,
  exercises,
  library,
}: {
  templateId: number;
  exercises: TemplateExercise[];
  library: Exercise[];
}) {
  const router = useRouter();
  const [swapFor, setSwapFor] = useState<TemplateExercise | null>(null);
  const [filter, setFilter] = useState("");
  const [group, setGroup] = useState("");
  const [guideFor, setGuideFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!swapFor) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [swapFor]);

  const usedIds = useMemo(
    () => new Set(exercises.map((e) => e.exercise_id)),
    [exercises]
  );

  const candidates = useMemo(() => {
    const q = filter.toLowerCase();
    return library.filter(
      (e) =>
        e.id !== swapFor?.exercise_id &&
        !usedIds.has(e.id) &&
        (group === "" || e.muscle_group === group) &&
        (q === "" ||
          e.name.toLowerCase().includes(q) ||
          e.muscle_group.toLowerCase().includes(q))
    );
  }, [library, filter, group, swapFor, usedIds]);

  function openSwap(row: TemplateExercise) {
    setSwapFor(row);
    setFilter("");
    // Pre-filter to the same muscle group — the usual swap is a like-for-like.
    setGroup(
      row.muscle_group && GROUPS.includes(row.muscle_group)
        ? row.muscle_group
        : ""
    );
    setError(null);
  }

  async function pick(exercise: Exercise) {
    if (!swapFor || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_exercise_id: swapFor.id,
          new_exercise_id: exercise.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Swap failed");
      }
      setSwapFor(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Swap failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
        {exercises.map((ex) => (
          <button
            key={ex.id}
            onClick={() => openSwap(ex)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
            title={`Swap ${ex.exercise_name}`}
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100/80">
              <ExerciseAnimation
                exerciseName={ex.exercise_name ?? ""}
                size={64}
              />
            </div>
            <div className="min-w-0 grow">
              <div className="truncate text-sm font-semibold text-zinc-900">
                {ex.exercise_name}
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                {ex.target_sets} sets of {ex.target_reps} reps
                {ex.target_weight != null ? ` @ ${ex.target_weight} kg` : ""}
              </div>
              <div className="mt-0.5 text-xs text-zinc-400">
                {ex.muscle_group} · rest {ex.rest_seconds}s
              </div>
            </div>
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
              aria-hidden
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 3l4 4-4 4M20 7H7M8 21l-4-4 4-4M4 17h13" />
              </svg>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-zinc-400">
        Tap an exercise to swap it for another from the library.
      </p>

      {mounted &&
        swapFor &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
            onClick={() => setSwapFor(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Swap ${swapFor.exercise_name}`}
          >
            <div
              className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 pb-3">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300" />
                <h2 className="text-lg font-semibold">
                  Swap {swapFor.exercise_name}
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {swapFor.target_sets} sets of {swapFor.target_reps} reps stay
                  as they are.
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Search the library…"
                    className="grow rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g === "" ? "All muscles" : g}
                      </option>
                    ))}
                  </select>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>
              <div className="grow overflow-y-auto px-3 pb-6">
                {candidates.map((e) => (
                  <div
                    key={e.id}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 hover:bg-zinc-50"
                  >
                    <button
                      onClick={() => pick(e)}
                      disabled={busy}
                      className="flex grow items-center gap-3 text-left disabled:opacity-50"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100/80">
                        <ExerciseAnimation exerciseName={e.name} size={48} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-900">
                          {e.name}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {e.muscle_group} · {e.equipment}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setGuideFor(e.name)}
                      className="shrink-0 rounded-full border border-zinc-300 px-2.5 py-1 text-xs text-zinc-500 transition hover:border-blue-500/60 hover:text-blue-600"
                      title={`How to perform ${e.name}`}
                    >
                      ?
                    </button>
                  </div>
                ))}
                {candidates.length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-zinc-500">
                    No matches — try another search or muscle group.
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {guideFor && (
        <ExerciseGuideModal
          exerciseName={guideFor}
          onClose={() => setGuideFor(null)}
        />
      )}
    </>
  );
}
