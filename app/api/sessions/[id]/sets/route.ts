import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  const exerciseId = Number(body.exercise_id);
  const reps = Number(body.reps);
  const weight = Number(body.weight ?? 0);
  const rpe = body.rpe != null && body.rpe !== "" ? Number(body.rpe) : null;

  if (!exerciseId || !Number.isFinite(reps) || reps <= 0) {
    return NextResponse.json(
      { error: "exercise_id and a positive reps value are required" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(weight) || weight < 0) {
    return NextResponse.json({ error: "Invalid weight" }, { status: 400 });
  }
  if (rpe != null && (!Number.isFinite(rpe) || rpe < 1 || rpe > 10)) {
    return NextResponse.json(
      { error: "RPE must be between 1 and 10" },
      { status: 400 }
    );
  }

  const db = getDb();
  const session = db
    .prepare("SELECT id, finished_at FROM workout_sessions WHERE id = ?")
    .get(id) as { id: number; finished_at: string | null } | undefined;
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const nextSet = db
    .prepare(
      "SELECT COALESCE(MAX(set_number), 0) + 1 AS n FROM set_logs WHERE session_id = ? AND exercise_id = ?"
    )
    .get(id, exerciseId) as { n: number };

  const result = db
    .prepare(
      "INSERT INTO set_logs (session_id, exercise_id, set_number, reps, weight, rpe) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(id, exerciseId, nextSet.n, reps, weight, rpe);

  const set = db
    .prepare(
      `SELECT s.*, e.name AS exercise_name
       FROM set_logs s JOIN exercises e ON e.id = s.exercise_id
       WHERE s.id = ?`
    )
    .get(result.lastInsertRowid);
  return NextResponse.json(set, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const setId = req.nextUrl.searchParams.get("setId");
  if (!setId) {
    return NextResponse.json({ error: "setId is required" }, { status: 400 });
  }
  const db = getDb();
  db.prepare("DELETE FROM set_logs WHERE id = ? AND session_id = ?").run(
    setId,
    id
  );
  return NextResponse.json({ ok: true });
}
