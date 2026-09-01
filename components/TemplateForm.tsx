"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ExerciseGuideModal from "./ExerciseGuideModal";
import ExercisePickerSheet from "./ExercisePickerSheet";
import type { Exercise } from "@/lib/types";
import { WEEKDAY_LABELS } from "@/lib/types";

interface FormExercise {
  exercise_id: number;
  target_sets: number;
  target_reps: string;
  target_weight: number | null;
  rest_seconds: number;
  notes: string;
  target_duration_min?: number | null;
  target_distance_km?: number | null;
  target_zone?: string | null;
}

const ZONE_OPTIONS = ["", "Z1", "Z2", "Z3", "Z4", "Z5"];

interface TemplateFormProps {
  templateId?: number;
  initialName?: string;
  initialDescription?: string;
  initialWeekday?: number | null;
  initialExercises?: FormExercise[];
}

export default function TemplateForm({
  templateId,
  initialName = "",
  initialDescription = "",
  initialWeekday = null,
  initialExercises = [],
}: TemplateFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [weekday, setWeekday] = useState<number | null>(initialWeekday);
  const [rows, setRows] = useState<FormExercise[]>(initialExercises);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customGroup, setCustomGroup] = useState("Other");
  const [guideFor, setGuideFor] = useState<string | null>(null);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then(setLibrary)
      .catch(() => setError("Failed to load the exercise library"));
  }, []);

  const exerciseById = useMemo(() => {
    const map = new Map<number, Exercise>();
    for (const e of library) map.set(e.id, e);
    return map;
  }, [library]);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return library.filter(
      (e) =>
        !rows.some((r) => r.exercise_id === e.id) &&
        (q === "" ||
          e.name.toLowerCase().includes(q) ||
          e.muscle_group.toLowerCase().includes(q))
    );
  }, [library, filter, rows]);

  function addExercise(exerciseId: number) {
    const isCardio = exerciseById.get(exerciseId)?.kind === "cardio";
    setRows((prev) => [
      ...prev,
      isCardio
        ? {
            exercise_id: exerciseId,
            target_sets: 1,
            target_reps: "",
            target_weight: null,
            rest_seconds: 0,
            notes: "",
            target_duration_min: 20,
            target_distance_km: null,
            target_zone: "Z2",
          }
        : {
            exercise_id: exerciseId,
            target_sets: 3,
            target_reps: "8-12",
            target_weight: null,
            rest_seconds: 90,
            notes: "",
          },
    ]);
    setFilter("");
  }

  function updateRow(index: number, patch: Partial<FormExercise>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function moveRow(index: number, direction: -1 | 1) {
    setRows((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function addCustomExercise() {
    const trimmed = customName.trim();
    if (!trimmed) return;
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, muscle_group: customGroup }),
    });
    if (res.ok) {
      const exercise: Exercise = await res.json();
      setLibrary((prev) => [...prev, exercise]);
      addExercise(exercise.id);
      setCustomName("");
      setShowCustom(false);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not add the exercise");
    }
  }

  async function save() {
    setError(null);
    if (!name.trim()) {
      setError("Give the workout a name");
      return;
    }
    if (rows.length === 0) {
      setError("Add at least one exercise");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        templateId ? `/api/templates/${templateId}` : "/api/templates",
        {
          method: templateId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, weekday, exercises: rows }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      router.push("/templates");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Workout name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Push Day A"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Description <span className="text-zinc-500">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Focus, tempo notes, anything future-you should know"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Scheduled day <span className="text-zinc-500">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_LABELS.map((day, i) => (
              <button
                key={day}
                type="button"
                onClick={() => setWeekday(weekday === i ? null : i)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  weekday === i
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Pick a day to place this workout in your weekly plan. Tap again to
            unschedule.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold">Exercises</h2>
        {rows.length === 0 && (
          <p className="mt-2 text-sm text-zinc-500">
            No exercises yet — search the library below to add some.
          </p>
        )}
        <div className="mt-4 space-y-3">
          {rows.map((row, i) => {
            const exercise = exerciseById.get(row.exercise_id);
            return (
              <div
                key={`${row.exercise_id}-${i}`}
                className="rounded-md border border-zinc-200 bg-zinc-100/80 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    <button
                      onClick={() => setSwapIndex(i)}
                      className="rounded text-left hover:text-blue-700"
                      title={`Swap ${exercise?.name ?? "exercise"} for another`}
                    >
                      {i + 1}. {exercise?.name ?? "…"}
                      <span className="ml-1.5 align-middle text-zinc-400" aria-hidden>
                        <svg
                          viewBox="0 0 24 24"
                          className="inline h-3.5 w-3.5"
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
                    <span className="ml-2 text-xs text-zinc-500">
                      {exercise?.muscle_group}
                    </span>
                    {exercise && (
                      <button
                        onClick={() => setGuideFor(exercise.name)}
                        className="ml-2 rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-500 transition hover:border-blue-500/60 hover:text-blue-600"
                        title={`How to perform ${exercise.name}`}
                      >
                        How to
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500">
                    <button
                      onClick={() => moveRow(i, -1)}
                      className="rounded px-2 py-1 hover:bg-zinc-100"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveRow(i, 1)}
                      className="rounded px-2 py-1 hover:bg-zinc-100"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeRow(i)}
                      className="rounded px-2 py-1 text-red-600 hover:bg-red-50"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {exercise?.kind === "cardio" ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <LabeledInput
                      label="Time (min)"
                      type="number"
                      value={
                        row.target_duration_min == null
                          ? ""
                          : String(row.target_duration_min)
                      }
                      onChange={(v) =>
                        updateRow(i, {
                          target_duration_min: v === "" ? null : Number(v),
                        })
                      }
                      placeholder="20"
                    />
                    <LabeledInput
                      label="Distance (km)"
                      type="number"
                      value={
                        row.target_distance_km == null
                          ? ""
                          : String(row.target_distance_km)
                      }
                      onChange={(v) =>
                        updateRow(i, {
                          target_distance_km: v === "" ? null : Number(v),
                        })
                      }
                      placeholder="—"
                    />
                    <div>
                      <label className="mb-1 block text-xs text-zinc-500">
                        HR zone
                      </label>
                      <select
                        value={row.target_zone ?? ""}
                        onChange={(e) =>
                          updateRow(i, {
                            target_zone: e.target.value || null,
                          })
                        }
                        className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                      >
                        {ZONE_OPTIONS.map((z) => (
                          <option key={z} value={z}>
                            {z === "" ? "—" : z}
                          </option>
                        ))}
                      </select>
                    </div>
                    <LabeledInput
                      label="Intervals"
                      type="number"
                      value={String(row.target_sets)}
                      onChange={(v) =>
                        updateRow(i, {
                          target_sets: Math.max(1, Number(v) || 1),
                        })
                      }
                    />
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <LabeledInput
                      label="Sets"
                      type="number"
                      value={String(row.target_sets)}
                      onChange={(v) =>
                        updateRow(i, { target_sets: Math.max(1, Number(v) || 1) })
                      }
                    />
                    <LabeledInput
                      label="Reps"
                      value={row.target_reps}
                      onChange={(v) => updateRow(i, { target_reps: v })}
                      placeholder="8-12"
                    />
                    <LabeledInput
                      label="Weight (kg)"
                      type="number"
                      value={row.target_weight == null ? "" : String(row.target_weight)}
                      onChange={(v) =>
                        updateRow(i, {
                          target_weight: v === "" ? null : Number(v),
                        })
                      }
                      placeholder="—"
                    />
                    <LabeledInput
                      label="Rest (s)"
                      type="number"
                      value={String(row.rest_seconds)}
                      onChange={(v) =>
                        updateRow(i, { rest_seconds: Math.max(0, Number(v) || 0) })
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 border-t border-zinc-200 pt-4">
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Add from library
          </label>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search exercises (e.g. squat, chest…)"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          {filter && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-zinc-200">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-zinc-500">
                  No matches.
                </div>
              ) : (
                filtered.slice(0, 20).map((e) => (
                  <div
                    key={e.id}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-zinc-100"
                  >
                    <button
                      onClick={() => addExercise(e.id)}
                      className="grow text-left"
                    >
                      {e.name}
                      <span className="ml-2 text-xs text-zinc-500">
                        {e.muscle_group} · {e.equipment}
                      </span>
                    </button>
                    <button
                      onClick={() => setGuideFor(e.name)}
                      className="ml-2 shrink-0 rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-500 transition hover:border-blue-500/60 hover:text-blue-600"
                      title={`How to perform ${e.name}`}
                    >
                      ?
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
          <div className="mt-3">
            {showCustom ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="grow">
                  <label className="mb-1 block text-xs text-zinc-500">
                    Custom exercise name
                  </label>
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    Muscle group
                  </label>
                  <select
                    value={customGroup}
                    onChange={(e) => setCustomGroup(e.target.value)}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {[
                      "Chest",
                      "Back",
                      "Legs",
                      "Shoulders",
                      "Arms",
                      "Core",
                      "Full Body",
                      "Other",
                    ].map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={addCustomExercise}
                  className="rounded-md bg-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowCustom(false)}
                  className="rounded-md px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCustom(true)}
                className="text-sm text-blue-700 hover:text-blue-600"
              >
                + Can&apos;t find it? Add a custom exercise
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : templateId ? "Save changes" : "Create workout"}
        </button>
        <button
          onClick={() => router.back()}
          className="rounded-md border border-zinc-300 px-5 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          Cancel
        </button>
      </div>

      {guideFor && (
        <ExerciseGuideModal
          exerciseName={guideFor}
          onClose={() => setGuideFor(null)}
        />
      )}

      {swapIndex !== null && rows[swapIndex] && (
        <ExercisePickerSheet
          title={`Swap ${exerciseById.get(rows[swapIndex].exercise_id)?.name ?? "exercise"}`}
          subtitle={`${rows[swapIndex].target_sets} sets of ${rows[swapIndex].target_reps} reps stay as they are.`}
          library={library}
          exclude={new Set(rows.map((r) => r.exercise_id))}
          initialGroup={
            exerciseById.get(rows[swapIndex].exercise_id)?.muscle_group ?? ""
          }
          onPick={(exercise) => {
            const oldKind = exerciseById.get(rows[swapIndex].exercise_id)?.kind;
            if (exercise.kind !== oldKind) {
              // Crossing strength <-> cardio: reset targets to kind defaults.
              updateRow(swapIndex, {
                exercise_id: exercise.id,
                ...(exercise.kind === "cardio"
                  ? {
                      target_sets: 1,
                      target_reps: "",
                      target_weight: null,
                      rest_seconds: 0,
                      target_duration_min: 20,
                      target_distance_km: null,
                      target_zone: "Z2",
                    }
                  : {
                      target_sets: 3,
                      target_reps: "8-12",
                      target_weight: null,
                      rest_seconds: 90,
                      target_duration_min: null,
                      target_distance_km: null,
                      target_zone: null,
                    }),
              });
            } else {
              updateRow(swapIndex, { exercise_id: exercise.id });
            }
            setSwapIndex(null);
          }}
          onClose={() => setSwapIndex(null)}
        />
      )}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-500">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}
