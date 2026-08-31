"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/lib/types";

const GOAL_OPTIONS = [
  { value: "size", label: "Build muscle size", hint: "Hypertrophy focus: 6-12 reps, progressive volume" },
  { value: "strength", label: "Get stronger", hint: "Heavy compounds: 3-6 reps, long rests" },
  { value: "fat_loss", label: "Lose fat", hint: "Keep muscle while dieting: dense, honest sessions" },
  { value: "maintain", label: "Maintain physique", hint: "Efficient sessions to hold what you have" },
] as const;

export default function ProfileForm({
  initial,
}: {
  initial: UserProfile | null;
}) {
  const router = useRouter();
  const [goal, setGoal] = useState(initial?.goal ?? "size");
  const [experience, setExperience] = useState(initial?.experience ?? "beginner");
  const [daysPerWeek, setDaysPerWeek] = useState(initial?.days_per_week ?? 3);
  const [equipment, setEquipment] = useState(initial?.equipment ?? "full_gym");
  const [age, setAge] = useState(initial?.age ? String(initial.age) : "");
  const [heightCm, setHeightCm] = useState(initial?.height_cm ? String(initial.height_cm) : "");
  const [weightKg, setWeightKg] = useState(initial?.weight_kg ? String(initial.weight_kg) : "");
  const [sex, setSex] = useState(initial?.sex ?? "");
  const [busy, setBusy] = useState<"save" | "plan" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function saveProfile(): Promise<boolean> {
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal,
        experience,
        days_per_week: daysPerWeek,
        equipment,
        age,
        height_cm: heightCm,
        weight_kg: weightKg,
        sex,
      }),
    });
    if (!res.ok) {
      setError("Could not save the profile — please try again.");
      return false;
    }
    return true;
  }

  async function handleSave() {
    setBusy("save");
    const ok = await saveProfile();
    setBusy(null);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    }
  }

  async function handleSaveAndGenerate() {
    if (
      !confirm(
        "This saves your profile and (re)generates your suggested weekly plan. Previously auto-generated workouts are replaced — workouts you created yourself are untouched. Continue?"
      )
    )
      return;
    setBusy("plan");
    const ok = await saveProfile();
    if (!ok) {
      setBusy(null);
      return;
    }
    const res = await fetch("/api/profile/plan", { method: "POST" });
    setBusy(null);
    if (res.ok) {
      router.push("/templates");
      router.refresh();
    } else {
      setError("Could not generate the plan — please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold">Your goal</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {GOAL_OPTIONS.map((g) => (
            <button
              key={g.value}
              onClick={() => setGoal(g.value)}
              className={`rounded-lg border p-3 text-left transition ${
                goal === g.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-zinc-300 hover:border-zinc-400"
              }`}
            >
              <div className="text-sm font-semibold">{g.label}</div>
              <div className="mt-0.5 text-xs text-zinc-500">{g.hint}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold">Training setup</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-zinc-700">Experience</label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value as typeof experience)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="beginner">Beginner (&lt; 1 year)</option>
              <option value="intermediate">Intermediate (1-3 years)</option>
              <option value="advanced">Advanced (3+ years)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-700">Days per week</label>
            <select
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(Number(e.target.value))}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {[2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-700">Equipment</label>
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value as typeof equipment)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="full_gym">Full gym</option>
              <option value="dumbbells">Dumbbells only</option>
              <option value="bodyweight">Bodyweight only</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold">
          About you <span className="text-sm font-normal text-zinc-500">(optional — helps the AI trainer)</span>
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-700">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-700">Height (cm)</label>
            <input
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-700">Weight (kg)</label>
            <input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-700">Sex</label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSaveAndGenerate}
          disabled={busy !== null}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {busy === "plan" ? "Generating…" : "Save & generate weekly plan"}
        </button>
        <button
          onClick={handleSave}
          disabled={busy !== null}
          className="rounded-md border border-zinc-300 px-5 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
        >
          {busy === "save" ? "Saving…" : "Save profile only"}
        </button>
        {saved && <span className="text-sm text-blue-700">Saved ✓</span>}
      </div>
      <p className="text-xs text-zinc-500">
        The generated plan appears under Workouts as normal editable workout
        designs. Your profile also tunes the AI trainer&apos;s coaching to your
        goal.
      </p>
    </div>
  );
}
