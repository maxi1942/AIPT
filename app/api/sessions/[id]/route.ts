import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureSessionExercises } from "@/lib/sessionPlan";
import type { WorkoutSession } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();

  const session = db
    .prepare("SELECT * FROM workout_sessions WHERE id = ?")
    .get(id) as WorkoutSession | undefined;
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const sessionExercises = ensureSessionExercises(db, session.id);

  const sets = db
    .prepare(
      `SELECT s.*, e.name AS exercise_name
       FROM set_logs s
       JOIN exercises e ON e.id = s.exercise_id
       WHERE s.session_id = ?
       ORDER BY s.logged_at ASC, s.id ASC`
    )
    .all(id);

  const chat = db
    .prepare(
      "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC, id ASC"
    )
    .all(id);

  return NextResponse.json({ session, sessionExercises, sets, chat });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = getDb();

  const session = db
    .prepare("SELECT * FROM workout_sessions WHERE id = ?")
    .get(id) as WorkoutSession | undefined;
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (body.finish === true && !session.finished_at) {
    db.prepare(
      "UPDATE workout_sessions SET finished_at = datetime('now') WHERE id = ?"
    ).run(id);
  }
  if (typeof body.notes === "string") {
    db.prepare("UPDATE workout_sessions SET notes = ? WHERE id = ?").run(
      body.notes,
      id
    );
  }
  if (typeof body.name === "string" && body.name.trim()) {
    db.prepare("UPDATE workout_sessions SET name = ? WHERE id = ?").run(
      body.name.trim(),
      id
    );
  }

  const updated = db
    .prepare("SELECT * FROM workout_sessions WHERE id = ?")
    .get(id);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM workout_sessions WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
