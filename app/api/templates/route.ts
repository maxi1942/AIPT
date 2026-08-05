import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET() {
  const db = getDb();
  const templates = db
    .prepare(
      `SELECT t.*, COUNT(te.id) AS exercise_count
       FROM templates t
       LEFT JOIN template_exercises te ON te.template_id = t.id
       GROUP BY t.id
       ORDER BY t.created_at DESC`
    )
    .all();
  return NextResponse.json(templates);
}

interface IncomingTemplateExercise {
  exercise_id: number;
  target_sets?: number;
  target_reps?: string;
  target_weight?: number | null;
  rest_seconds?: number;
  notes?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "");
  const exercises: IncomingTemplateExercise[] = Array.isArray(body.exercises)
    ? body.exercises
    : [];

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (exercises.length === 0) {
    return NextResponse.json(
      { error: "Add at least one exercise" },
      { status: 400 }
    );
  }

  const db = getDb();
  const insertTemplate = db.prepare(
    "INSERT INTO templates (name, description) VALUES (?, ?)"
  );
  const insertExercise = db.prepare(
    `INSERT INTO template_exercises
       (template_id, exercise_id, position, target_sets, target_reps, target_weight, rest_seconds, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const templateId = db.transaction(() => {
    const result = insertTemplate.run(name, description);
    const id = Number(result.lastInsertRowid);
    exercises.forEach((ex, i) => {
      insertExercise.run(
        id,
        ex.exercise_id,
        i,
        ex.target_sets ?? 3,
        ex.target_reps ?? "8-12",
        ex.target_weight ?? null,
        ex.rest_seconds ?? 90,
        ex.notes ?? ""
      );
    });
    return id;
  })();

  const template = db
    .prepare("SELECT * FROM templates WHERE id = ?")
    .get(templateId);
  return NextResponse.json(template, { status: 201 });
}
