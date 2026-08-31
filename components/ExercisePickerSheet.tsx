"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ExerciseAnimation from "./ExerciseAnimation";
import ExerciseGuideModal from "./ExerciseGuideModal";
import type { Exercise } from "@/lib/types";

const GROUPS = ["", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full Body"];

/**
 * Bottom-sheet exercise library picker, shared by the workout detail view
 * and the edit form. Pre-filters to `initialGroup` when given (the usual
 * swap is like-for-like).
 */
export default function ExercisePickerSheet({
  title,
  subtitle,
  library,
  exclude,
  initialGroup = "",
  busy = false,
  error = null,
  onPick,
  onClose,
}: {
  title: string;
  subtitle?: string;
  library: Exercise[];
  exclude: Set<number>;
  initialGroup?: string;
  busy?: boolean;
  error?: string | null;
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState("");
  const [group, setGroup] = useState(
    GROUPS.includes(initialGroup) ? initialGroup : ""
  );
  const [guideFor, setGuideFor] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const candidates = useMemo(() => {
    const q = filter.toLowerCase();
    return library.filter(
      (e) =>
        !exclude.has(e.id) &&
        (group === "" || e.muscle_group === group) &&
        (q === "" ||
          e.name.toLowerCase().includes(q) ||
          e.muscle_group.toLowerCase().includes(q))
    );
  }, [library, filter, group, exclude]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 pb-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300" />
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
          )}
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
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        <div className="grow overflow-y-auto px-3 pb-6">
          {candidates.map((e) => (
            <div
              key={e.id}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 hover:bg-zinc-50"
            >
              <button
                onClick={() => onPick(e)}
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
      {guideFor && (
        <ExerciseGuideModal
          exerciseName={guideFor}
          onClose={() => setGuideFor(null)}
        />
      )}
    </div>,
    document.body
  );
}
