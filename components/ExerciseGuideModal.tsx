"use client";

import { useEffect } from "react";
import {
  getExerciseGuide,
  videoSearchUrl,
  MUSCLE_LABELS,
} from "@/lib/exerciseGuides";
import { getRigForExercise } from "@/lib/animationRigs";
import ExerciseAnimation from "./ExerciseAnimation";
import MuscleDiagram from "./MuscleDiagram";

export default function ExerciseGuideModal({
  exerciseName,
  onClose,
}: {
  exerciseName: string;
  onClose: () => void;
}) {
  const guide = getExerciseGuide(exerciseName);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`How to perform ${exerciseName}`}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-zinc-700 bg-zinc-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-5 py-3">
          <h2 className="font-semibold">{exerciseName}</h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 p-5">
          {guide ? (
            <>
              <div>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {getRigForExercise(exerciseName) && (
                    <figure className="text-center">
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950/60">
                        <ExerciseAnimation exerciseName={exerciseName} />
                      </div>
                      <figcaption className="mt-1 text-xs text-zinc-500">
                        Movement (stylized)
                      </figcaption>
                    </figure>
                  )}
                  <MuscleDiagram
                    primary={guide.primary}
                    secondary={guide.secondary}
                  />
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {guide.primary.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300"
                    >
                      {MUSCLE_LABELS[m]}
                    </span>
                  ))}
                  {guide.secondary.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400"
                    >
                      {MUSCLE_LABELS[m]}
                    </span>
                  ))}
                </div>
              </div>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-zinc-200">
                  How to perform it
                </h3>
                <ol className="space-y-1.5">
                  {guide.steps.map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-zinc-300">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-emerald-300">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-zinc-200">
                  Form cues
                </h3>
                <ul className="space-y-1 text-sm text-zinc-300">
                  {guide.cues.map((cue, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-emerald-300">✓</span>
                      {cue}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-zinc-200">
                  Common mistakes
                </h3>
                <ul className="space-y-1 text-sm text-zinc-300">
                  {guide.mistakes.map((mistake, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-red-400">✕</span>
                      {mistake}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : (
            <p className="text-sm text-zinc-400">
              No built-in guide for this custom exercise yet — the video search
              below is the fastest way to see it performed, and the AI trainer
              can talk you through form during a workout.
            </p>
          )}

          <a
            href={videoSearchUrl(exerciseName)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-emerald-400/60 hover:text-white"
          >
            <span aria-hidden>▶</span> Watch video demonstrations
          </a>
        </div>
      </div>
    </div>
  );
}
