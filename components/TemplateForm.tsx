"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Exercise } from "@/lib/types";

interface FormExercise {
  exercise_id: number;
  target_sets: number;
  target_reps: string;
  target_weight: number | null;
  rest_seconds: number;
  notes: string;
}

interface TemplateFormProps {
  templateId?: number;
  initialName?: string;
  initialDescription?: string;
  initialExercises?: FormExercise[];
}

export default function TemplateForm({
  templateId,
  initialName = "",
  initialDescription = "",
  initialExercises = [],
}: TemplateFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [rows, setRows] = useState<FormExercise[]>(initialExercises);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customGroup, setCustomGroup] = useState("Other");

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
    setRows((prev) => [
      ...prev,
      {
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
          body: JSON.stringify({ name, description, exercises: rows }),
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
      <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Workout name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Push Day A"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Description <span className="text-zinc-500">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Focus, tempo notes, anything future-you should know"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
          />
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="font-semibold">Exercises</h2>
        {rows.length === 0 && (
          <p className="mt-2 text-sm text-zinc-400">
            No exercises yet — search the library below to add some.
          </p>
        )}
        <div className="mt-4 space-y-3">
          {rows.map((row, i) => {
            const exercise = exerciseById.get(row.exercise_id);
            return (
              <div
                key={`${row.exercise_id}-${i}`}
                className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {i + 1}. {exercise?.name ?? "…"}
                    <span className="ml-2 text-xs text-zinc-500">
                      {exercise?.muscle_group}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-400">
                    <button
                      onClick={() => moveRow(i, -1)}
                      className="rounded px-2 py-1 hover:bg-zinc-800"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveRow(i, 1)}
                      className="rounded px-2 py-1 hover:bg-zinc-800"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeRow(i)}
                      className="rounded px-2 py-1 text-red-400 hover:bg-red-500/10"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
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
              </div>
            );
          })}
        </div>

        <div className="mt-5 border-t border-zinc-800 pt-4">
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Add from library
          </label>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search exercises (e.g. squat, chest…)"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
          />
          {filter && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-zinc-800">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-zinc-500">
                  No matches.
                </div>
              ) : (
                filtered.slice(0, 20).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => addExercise(e.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-800"
                  >
                    <span>{e.name}</span>
                    <span className="text-xs text-zinc-500">
                      {e.muscle_group} · {e.equipment}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
          <div className="mt-3">
            {showCustom ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="grow">
                  <label className="mb-1 block text-xs text-zinc-400">
                    Custom exercise name
                  </label>
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">
                    Muscle group
                  </label>
                  <select
                    value={customGroup}
                    onChange={(e) => setCustomGroup(e.target.value)}
                    className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
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
                  className="rounded-md bg-zinc-700 px-3 py-2 text-sm font-medium hover:bg-zinc-600"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowCustom(false)}
                  className="rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCustom(true)}
                className="text-sm text-emerald-300 hover:text-emerald-200"
              >
                + Can&apos;t find it? Add a custom exercise
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-emerald-400 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 disabled:opacity-50"
        >
          {saving ? "Saving…" : templateId ? "Save changes" : "Create workout"}
        </button>
        <button
          onClick={() => router.back()}
          className="rounded-md border border-zinc-700 px-5 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
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
      <label className="mb-1 block text-xs text-zinc-400">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm outline-none focus:border-emerald-400"
      />
    </div>
  );
}
