import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  const exerciseId = Number(body.exercise_id);
  const rpe = body.rpe != null && body.rpe !== "" ? Number(body.rpe) : null;

  // Cardio effort: time and/or distance, optional average heart rate.
  const durationMin =
    body.duration_min != null && body.duration_min !== ""
      ? Number(body.duration_min)
      : null;
  const distanceKm =
    body.distance_km != null && body.distance_km !== ""
      ? Number(body.distance_km)
      : null;
  const avgHr =
    body.avg_hr != null && body.avg_hr !== "" ? Number(body.avg_hr) : null;
  const isCardio =
    (durationMin != null && durationMin > 0) ||
    (distanceKm != null && distanceKm > 0);

  const reps = isCardio ? 0 : Number(body.reps);
  const weight = isCardio ? 0 : Number(body.weight ?? 0);

  if (!exerciseId) {
    return NextResponse.json(
      { error: "exercise_id is required" },
      { status: 400 }
    );
  }
  if (!isCardio && (!Number.isFinite(reps) || reps <= 0)) {
    return NextResponse.json(
      { error: "A positive reps value — or a cardio duration/distance — is required" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(weight) || weight < 0) {
    return NextResponse.json({ error: "Invalid weight" }, { status: 400 });
  }
  if (
    (durationMin != null && (!Number.isFinite(durationMin) || durationMin < 0)) ||
    (distanceKm != null && (!Number.isFinite(distanceKm) || distanceKm < 0)) ||
    (avgHr != null && (!Number.isFinite(avgHr) || avgHr < 30 || avgHr > 250))
  ) {
    return NextResponse.json(
      { error: "Invalid duration, distance, or heart rate" },
      { status: 400 }
    );
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
      `INSERT INTO set_logs
         (session_id, exercise_id, set_number, reps, weight, rpe, duration_seconds, distance_km, avg_hr)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      exerciseId,
      nextSet.n,
      reps,
      weight,
      rpe,
      isCardio && durationMin ? Math.round(durationMin * 60) : null,
      isCardio ? distanceKm : null,
      isCardio ? avgHr : null
    );

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
