import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureSessionExercises } from "@/lib/sessionPlan";

type Params = { params: Promise<{ id: string }> };

/** Add an exercise to the live session's plan. */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const exerciseId = Number(body.exercise_id);
  if (!exerciseId) {
    return NextResponse.json(
      { error: "exercise_id is required" },
      { status: 400 }
    );
  }

  const db = getDb();
  ensureSessionExercises(db, Number(id));
  const next = db
    .prepare(
      "SELECT COALESCE(MAX(position), -1) + 1 AS p FROM session_exercises WHERE session_id = ?"
    )
    .get(id) as { p: number };

  const kind = (
    db.prepare("SELECT kind FROM exercises WHERE id = ?").get(exerciseId) as
      | { kind: string }
      | undefined
  )?.kind;

  if (kind === "cardio") {
    db.prepare(
      `INSERT INTO session_exercises
         (session_id, exercise_id, position, target_sets, target_reps, target_weight, rest_seconds, notes,
          target_duration_min, target_distance_km, target_zone)
       VALUES (?, ?, ?, 1, '', NULL, 0, '', ?, NULL, 'Z2')`
    ).run(
      id,
      exerciseId,
      next.p,
      body.target_duration_min != null && body.target_duration_min !== ""
        ? Number(body.target_duration_min)
        : 20
    );
  } else {
    db.prepare(
      `INSERT INTO session_exercises
         (session_id, exercise_id, position, target_sets, target_reps, target_weight, rest_seconds, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, '')`
    ).run(
      id,
      exerciseId,
      next.p,
      Number(body.target_sets) || 3,
      typeof body.target_reps === "string" && body.target_reps
        ? body.target_reps
        : "8-12",
      body.target_weight != null && body.target_weight !== ""
        ? Number(body.target_weight)
        : null,
      Number(body.rest_seconds) || 90
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** Swap the exercise, or move it up/down in the session's plan. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const rowId = Number(body.id);
  if (!rowId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare("SELECT * FROM session_exercises WHERE id = ? AND session_id = ?")
    .get(rowId, id) as
    | { id: number; position: number }
    | undefined;
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.exercise_id) {
    const kinds = db
      .prepare(
        `SELECT (SELECT kind FROM exercises WHERE id = se.exercise_id) AS old_kind,
                (SELECT kind FROM exercises WHERE id = ?) AS new_kind
         FROM session_exercises se WHERE se.id = ?`
      )
      .get(Number(body.exercise_id), rowId) as
      | { old_kind: string; new_kind: string | null }
      | undefined;
    if (kinds?.new_kind && kinds.new_kind !== kinds.old_kind) {
      // Crossing strength <-> cardio: reset the slot's targets too.
      if (kinds.new_kind === "cardio") {
        db.prepare(
          `UPDATE session_exercises
           SET exercise_id = ?, target_sets = 1, target_reps = '', target_weight = NULL,
               rest_seconds = 0, target_duration_min = 20, target_distance_km = NULL, target_zone = 'Z2'
           WHERE id = ?`
        ).run(Number(body.exercise_id), rowId);
      } else {
        db.prepare(
          `UPDATE session_exercises
           SET exercise_id = ?, target_sets = 3, target_reps = '8-12', target_weight = NULL,
               rest_seconds = 90, target_duration_min = NULL, target_distance_km = NULL, target_zone = NULL
           WHERE id = ?`
        ).run(Number(body.exercise_id), rowId);
      }
    } else {
      db.prepare(
        "UPDATE session_exercises SET exercise_id = ? WHERE id = ?"
      ).run(Number(body.exercise_id), rowId);
    }
  }

  if (body.direction === -1 || body.direction === 1) {
    const neighbor = db
      .prepare(
        `SELECT id, position FROM session_exercises
         WHERE session_id = ? AND position ${body.direction === -1 ? "<" : ">"} ?
         ORDER BY position ${body.direction === -1 ? "DESC" : "ASC"} LIMIT 1`
      )
      .get(id, row.position) as { id: number; position: number } | undefined;
    if (neighbor) {
      const swap = db.prepare(
        "UPDATE session_exercises SET position = ? WHERE id = ?"
      );
      db.transaction(() => {
        swap.run(neighbor.position, row.id);
        swap.run(row.position, neighbor.id);
      })();
    }
  }

  return NextResponse.json({ ok: true });
}

/** Remove an exercise from the live session's plan. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const rowId = req.nextUrl.searchParams.get("id");
  if (!rowId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const db = getDb();
  db.prepare(
    "DELETE FROM session_exercises WHERE id = ? AND session_id = ?"
  ).run(rowId, id);
  return NextResponse.json({ ok: true });
}
