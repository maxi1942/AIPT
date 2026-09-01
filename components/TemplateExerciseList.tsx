"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ExercisePickerSheet from "./ExercisePickerSheet";
import ExerciseThumb from "./ExerciseThumb";
import { zoneLabel } from "@/lib/cardio";
import type { Exercise, TemplateExercise } from "@/lib/types";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usedIds = useMemo(
    () => new Set(exercises.map((e) => e.exercise_id)),
    [exercises]
  );

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
            onClick={() => {
              setError(null);
              setSwapFor(ex);
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
            title={`Swap ${ex.exercise_name}`}
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100/80">
              <ExerciseThumb exerciseName={ex.exercise_name ?? ""} size={64} />
            </div>
            <div className="min-w-0 grow">
              <div className="truncate text-sm font-semibold text-zinc-900">
                {ex.exercise_name}
              </div>
              {ex.exercise_kind === "cardio" ? (
                <>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {[
                      ex.target_duration_min
                        ? `${ex.target_duration_min} min`
                        : null,
                      ex.target_distance_km
                        ? `${ex.target_distance_km} km`
                        : null,
                      ex.target_zone ? zoneLabel(ex.target_zone) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Free effort"}
                    {ex.target_sets > 1 ? ` × ${ex.target_sets}` : ""}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-400">Cardio</div>
                </>
              ) : (
                <>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {ex.target_sets} sets of {ex.target_reps} reps
                    {ex.target_weight != null
                      ? ` @ ${ex.target_weight} kg`
                      : ""}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-400">
                    {ex.muscle_group} · rest {ex.rest_seconds}s
                  </div>
                </>
              )}
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

      {swapFor && (
        <ExercisePickerSheet
          title={`Swap ${swapFor.exercise_name}`}
          subtitle={
            swapFor.exercise_kind === "cardio"
              ? "Duration and zone targets carry over to another cardio mode."
              : `${swapFor.target_sets} sets of ${swapFor.target_reps} reps stay as they are.`
          }
          library={library}
          exclude={usedIds}
          initialGroup={swapFor.muscle_group ?? ""}
          busy={busy}
          error={error}
          onPick={pick}
          onClose={() => setSwapFor(null)}
        />
      )}
    </>
  );
}
