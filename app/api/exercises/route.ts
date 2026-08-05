import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET() {
  const db = getDb();
  const exercises = db
    .prepare("SELECT * FROM exercises ORDER BY muscle_group, name")
    .all();
  return NextResponse.json(exercises);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const muscleGroup = String(body.muscle_group ?? "Other").trim() || "Other";
  const equipment = String(body.equipment ?? "other").trim() || "other";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const db = getDb();
  try {
    const result = db
      .prepare(
        "INSERT INTO exercises (name, muscle_group, equipment, is_custom) VALUES (?, ?, ?, 1)"
      )
      .run(name, muscleGroup, equipment);
    const exercise = db
      .prepare("SELECT * FROM exercises WHERE id = ?")
      .get(result.lastInsertRowid);
    return NextResponse.json(exercise, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "An exercise with that name already exists" },
      { status: 409 }
    );
  }
}
