import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();
  const template = db.prepare("SELECT * FROM templates WHERE id = ?").get(id);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  const exercises = db
    .prepare(
      `SELECT te.*, e.name AS exercise_name, e.muscle_group, e.equipment
       FROM template_exercises te
       JOIN exercises e ON e.id = te.exercise_id
       WHERE te.template_id = ?
       ORDER BY te.position ASC`
    )
    .all(id);
  return NextResponse.json({ ...template, exercises });
}

interface IncomingTemplateExercise {
  exercise_id: number;
  target_sets?: number;
  target_reps?: string;
  target_weight?: number | null;
  rest_seconds?: number;
  notes?: string;
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "");
  const weekday =
    body.weekday === null || body.weekday === undefined || body.weekday === ""
      ? null
      : Math.min(6, Math.max(0, Number(body.weekday)));
  const exercises: IncomingTemplateExercise[] = Array.isArray(body.exercises)
    ? body.exercises
    : [];

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM templates WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const insertExercise = db.prepare(
    `INSERT INTO template_exercises
       (template_id, exercise_id, position, target_sets, target_reps, target_weight, rest_seconds, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  db.transaction(() => {
    db.prepare(
      "UPDATE templates SET name = ?, description = ?, weekday = ? WHERE id = ?"
    ).run(name, description, weekday, id);
    db.prepare("DELETE FROM template_exercises WHERE template_id = ?").run(id);
    exercises.forEach((ex, i) => {
      insertExercise.run(
        Number(id),
        ex.exercise_id,
        i,
        ex.target_sets ?? 3,
        ex.target_reps ?? "8-12",
        ex.target_weight ?? null,
        ex.rest_seconds ?? 90,
        ex.notes ?? ""
      );
    });
  })();

  const template = db.prepare("SELECT * FROM templates WHERE id = ?").get(id);
  return NextResponse.json(template);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM templates WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
