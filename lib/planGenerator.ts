import type Database from "better-sqlite3";
import type { EquipmentAccess, Goal, UserProfile } from "./types";

/**
 * Generates a suggested weekly workout plan (a set of templates) from the
 * user's profile. Templates are ordinary editable templates; regenerating
 * replaces the previously auto-generated ones and nothing else.
 */

export const AUTO_PLAN_MARKER = "Auto-generated from your profile";

interface Slot {
  /** Candidate exercise names, best first; first available & unused wins. */
  candidates: string[];
  compound: boolean;
}

const slot = (compound: boolean, ...candidates: string[]): Slot => ({
  candidates,
  compound,
});

const SQUAT = slot(true, "Barbell Back Squat", "Leg Press", "Bulgarian Split Squat", "Walking Lunge");
const HINGE = slot(true, "Deadlift", "Romanian Deadlift", "Kettlebell Swing", "Hip Thrust");
const LUNGE = slot(true, "Walking Lunge", "Bulgarian Split Squat", "Leg Press");
const HORIZ_PUSH = slot(true, "Barbell Bench Press", "Dumbbell Bench Press", "Push-Up");
const INCLINE_PUSH = slot(true, "Incline Dumbbell Press", "Push-Up", "Dips");
const VERT_PUSH = slot(true, "Overhead Press", "Seated Dumbbell Press", "Push-Up");
const HORIZ_PULL = slot(true, "Barbell Row", "Dumbbell Row", "Seated Cable Row");
const VERT_PULL = slot(true, "Pull-Up", "Lat Pulldown", "Chin-Up", "Dumbbell Row");
const HINGE_ISO = slot(false, "Romanian Deadlift", "Leg Curl", "Hip Thrust");
const QUAD_ISO = slot(false, "Leg Extension", "Walking Lunge", "Bulgarian Split Squat");
const GLUTES = slot(true, "Hip Thrust", "Bulgarian Split Squat", "Kettlebell Swing");
const SIDE_DELT = slot(false, "Lateral Raise", "Rear Delt Fly");
const REAR_DELT = slot(false, "Face Pull", "Rear Delt Fly");
const BICEPS = slot(false, "Barbell Curl", "Dumbbell Curl", "Chin-Up");
const TRICEPS = slot(false, "Triceps Pushdown", "Overhead Triceps Extension", "Skull Crusher", "Dips");
const CALVES = slot(false, "Standing Calf Raise");
const CORE = slot(false, "Plank", "Hanging Leg Raise", "Cable Crunch", "Ab Wheel Rollout");

interface DayPlan {
  name: string;
  slots: Slot[];
}

function splitForProfile(profile: UserProfile): DayPlan[] {
  const days = profile.days_per_week;
  const fullBodyA: DayPlan = { name: "Full Body A", slots: [SQUAT, HORIZ_PUSH, HORIZ_PULL, SIDE_DELT, CORE] };
  const fullBodyB: DayPlan = { name: "Full Body B", slots: [HINGE, VERT_PUSH, VERT_PULL, HINGE_ISO, CORE] };
  const fullBodyC: DayPlan = { name: "Full Body C", slots: [LUNGE, INCLINE_PUSH, HORIZ_PULL, BICEPS, TRICEPS] };
  const push: DayPlan = { name: "Push", slots: [HORIZ_PUSH, VERT_PUSH, INCLINE_PUSH, SIDE_DELT, TRICEPS] };
  const pull: DayPlan = { name: "Pull", slots: [HINGE, HORIZ_PULL, VERT_PULL, REAR_DELT, BICEPS] };
  const legs: DayPlan = { name: "Legs", slots: [SQUAT, HINGE_ISO, QUAD_ISO, CALVES, CORE] };
  const upperA: DayPlan = { name: "Upper A", slots: [HORIZ_PUSH, HORIZ_PULL, VERT_PUSH, BICEPS, TRICEPS] };
  const lowerA: DayPlan = { name: "Lower A", slots: [SQUAT, HINGE_ISO, QUAD_ISO, CALVES, CORE] };
  const upperB: DayPlan = { name: "Upper B", slots: [VERT_PULL, INCLINE_PUSH, SIDE_DELT, REAR_DELT, TRICEPS] };
  const lowerB: DayPlan = { name: "Lower B", slots: [HINGE, GLUTES, QUAD_ISO, CALVES, CORE] };

  switch (days) {
    case 2:
      return [fullBodyA, fullBodyB];
    case 3:
      return profile.goal === "strength"
        ? [fullBodyA, fullBodyB, fullBodyC]
        : [push, pull, legs];
    case 4:
      return [upperA, lowerA, upperB, lowerB];
    case 5:
      return [push, pull, legs, upperA, lowerA];
    default:
      return [
        { ...push, name: "Push A" },
        { ...pull, name: "Pull A" },
        { ...legs, name: "Legs A" },
        { ...push, name: "Push B" },
        { ...pull, name: "Pull B" },
        { ...legs, name: "Legs B" },
      ];
  }
}

/** Sets / reps / rest per goal, split by compound vs isolation slots. */
function schemeFor(goal: Goal, compound: boolean, experience: string) {
  const table: Record<Goal, { c: [number, string, number]; i: [number, string, number] }> = {
    strength: { c: [4, "3-5", 180], i: [3, "6-8", 120] },
    size: { c: [4, "6-10", 120], i: [3, "10-15", 90] },
    fat_loss: { c: [3, "8-12", 75], i: [3, "12-15", 60] },
    maintain: { c: [3, "6-10", 120], i: [2, "10-15", 90] },
  };
  const [sets, reps, rest] = compound ? table[goal].c : table[goal].i;
  const cappedSets = experience === "beginner" ? Math.min(sets, 3) : sets;
  return { sets: cappedSets, reps, rest };
}

function allowedEquipment(access: EquipmentAccess): Set<string> {
  switch (access) {
    case "full_gym":
      return new Set(["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "other"]);
    case "dumbbells":
      return new Set(["dumbbell", "bodyweight", "kettlebell", "other"]);
    case "bodyweight":
      return new Set(["bodyweight", "other"]);
  }
}

export interface GeneratedPlanSummary {
  templates: Array<{ id: number; name: string; exercises: number }>;
}

export function generatePlan(
  db: Database.Database,
  profile: UserProfile
): GeneratedPlanSummary {
  const allowed = allowedEquipment(profile.equipment);
  const library = db
    .prepare("SELECT id, name, equipment FROM exercises")
    .all() as Array<{ id: number; name: string; equipment: string }>;
  const byName = new Map(library.map((e) => [e.name.toLowerCase(), e]));

  const days = splitForProfile(profile);
  // Beginners get shorter sessions: drop the last accessory slot.
  const slotCount = profile.experience === "beginner" ? 4 : 5;

  // Replace any previously generated plan, leave user-made templates alone.
  db.prepare("DELETE FROM templates WHERE description LIKE ?").run(
    `${AUTO_PLAN_MARKER}%`
  );

  const insertTemplate = db.prepare(
    "INSERT INTO templates (name, description) VALUES (?, ?)"
  );
  const insertExercise = db.prepare(
    `INSERT INTO template_exercises
       (template_id, exercise_id, position, target_sets, target_reps, target_weight, rest_seconds, notes)
     VALUES (?, ?, ?, ?, ?, NULL, ?, '')`
  );

  const summary: GeneratedPlanSummary = { templates: [] };

  db.transaction(() => {
    days.forEach((day, dayIndex) => {
      const used = new Set<number>();
      const picked: Array<{ id: number; slot: Slot }> = [];

      for (const s of day.slots.slice(0, slotCount)) {
        const exercise = s.candidates
          .map((n) => byName.get(n.toLowerCase()))
          .find((e) => e && allowed.has(e.equipment) && !used.has(e.id));
        if (!exercise) continue;
        used.add(exercise.id);
        picked.push({ id: exercise.id, slot: s });
      }
      if (picked.length === 0) return;

      const name = `Day ${dayIndex + 1} · ${day.name}`;
      const result = insertTemplate.run(
        name,
        `${AUTO_PLAN_MARKER} — edit freely, or regenerate from your profile.`
      );
      const templateId = Number(result.lastInsertRowid);

      picked.forEach((p, i) => {
        const scheme = schemeFor(profile.goal, p.slot.compound, profile.experience);
        insertExercise.run(templateId, p.id, i, scheme.sets, scheme.reps, scheme.rest);
      });

      summary.templates.push({
        id: templateId,
        name,
        exercises: picked.length,
      });
    });
  })();

  return summary;
}
