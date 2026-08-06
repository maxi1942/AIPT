import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const GOALS = ["size", "fat_loss", "strength", "maintain"];
const EXPERIENCE = ["beginner", "intermediate", "advanced"];
const EQUIPMENT = ["full_gym", "dumbbells", "bodyweight"];

export function GET() {
  const db = getDb();
  const profile = db.prepare("SELECT * FROM user_profile WHERE id = 1").get();
  return NextResponse.json(profile ?? null);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  const goal = GOALS.includes(body.goal) ? body.goal : "size";
  const experience = EXPERIENCE.includes(body.experience)
    ? body.experience
    : "beginner";
  const equipment = EQUIPMENT.includes(body.equipment)
    ? body.equipment
    : "full_gym";
  const daysPerWeek = Math.min(6, Math.max(2, Number(body.days_per_week) || 3));

  const optionalNumber = (v: unknown) => {
    const n = Number(v);
    return v != null && v !== "" && Number.isFinite(n) && n > 0 ? n : null;
  };

  const db = getDb();
  db.prepare(
    `INSERT INTO user_profile (id, goal, experience, days_per_week, equipment, age, height_cm, weight_kg, sex, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       goal = excluded.goal,
       experience = excluded.experience,
       days_per_week = excluded.days_per_week,
       equipment = excluded.equipment,
       age = excluded.age,
       height_cm = excluded.height_cm,
       weight_kg = excluded.weight_kg,
       sex = excluded.sex,
       updated_at = datetime('now')`
  ).run(
    goal,
    experience,
    daysPerWeek,
    equipment,
    optionalNumber(body.age),
    optionalNumber(body.height_cm),
    optionalNumber(body.weight_kg),
    typeof body.sex === "string" && body.sex ? body.sex : null
  );

  const profile = db.prepare("SELECT * FROM user_profile WHERE id = 1").get();
  return NextResponse.json(profile);
}
