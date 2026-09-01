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
      `SELECT te.*, e.name AS exercise_name, e.muscle_group, e.equipment, e.kind AS exercise_kind
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
  target_duration_min?: number | null;
  target_distance_km?: number | null;
  target_zone?: string | null;
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
       (template_id, exercise_id, position, target_sets, target_reps, target_weight, rest_seconds, notes,
        target_duration_min, target_distance_km, target_zone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        ex.notes ?? "",
        ex.target_duration_min ?? null,
        ex.target_distance_km ?? null,
        ex.target_zone ?? null
      );
    });
  })();

  const template = db.prepare("SELECT * FROM templates WHERE id = ?").get(id);
  return NextResponse.json(template);
}

/** Swap one exercise in the template for another, keeping sets/reps/rest. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const rowId = Number(body.template_exercise_id);
  const newExerciseId = Number(body.new_exercise_id);

  if (!rowId || !newExerciseId) {
    return NextResponse.json(
      { error: "template_exercise_id and new_exercise_id are required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT te.id, e.kind AS old_kind
       FROM template_exercises te
       JOIN exercises e ON e.id = te.exercise_id
       WHERE te.id = ? AND te.template_id = ?`
    )
    .get(rowId, id) as { id: number; old_kind: string } | undefined;
  if (!row) {
    return NextResponse.json(
      { error: "Exercise not found in this workout" },
      { status: 404 }
    );
  }
  const exercise = db
    .prepare("SELECT id, kind FROM exercises WHERE id = ?")
    .get(newExerciseId) as { id: number; kind: string } | undefined;
  if (!exercise) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  if (exercise.kind !== row.old_kind) {
    // Crossing strength <-> cardio: reset the slot's targets to kind defaults.
    if (exercise.kind === "cardio") {
      db.prepare(
        `UPDATE template_exercises
         SET exercise_id = ?, target_sets = 1, target_reps = '', target_weight = NULL,
             rest_seconds = 0, target_duration_min = 20, target_distance_km = NULL, target_zone = 'Z2'
         WHERE id = ?`
      ).run(newExerciseId, rowId);
    } else {
      db.prepare(
        `UPDATE template_exercises
         SET exercise_id = ?, target_sets = 3, target_reps = '8-12', target_weight = NULL,
             rest_seconds = 90, target_duration_min = NULL, target_distance_km = NULL, target_zone = NULL
         WHERE id = ?`
      ).run(newExerciseId, rowId);
    }
  } else {
    db.prepare("UPDATE template_exercises SET exercise_id = ? WHERE id = ?").run(
      newExerciseId,
      rowId
    );
  }

  const updated = db
    .prepare(
      `SELECT te.*, e.name AS exercise_name, e.muscle_group, e.equipment
       FROM template_exercises te
       JOIN exercises e ON e.id = te.exercise_id
       WHERE te.id = ?`
    )
    .get(rowId);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM templates WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
