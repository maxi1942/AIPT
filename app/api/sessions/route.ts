import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { copyTemplateToSession } from "@/lib/sessionPlan";

export function GET() {
  const db = getDb();
  const sessions = db
    .prepare(
      `SELECT w.*,
              t.name AS template_name,
              COUNT(s.id) AS set_count,
              COALESCE(ROUND(SUM(s.reps * s.weight)), 0) AS total_volume
       FROM workout_sessions w
       LEFT JOIN templates t ON t.id = w.template_id
       LEFT JOIN set_logs s ON s.session_id = w.id
       GROUP BY w.id
       ORDER BY w.started_at DESC`
    )
    .all();
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const templateId = body.template_id ? Number(body.template_id) : null;
  const db = getDb();

  let name = String(body.name ?? "").trim();
  if (templateId) {
    const template = db
      .prepare("SELECT name FROM templates WHERE id = ?")
      .get(templateId) as { name: string } | undefined;
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }
    if (!name) name = template.name;
  }
  if (!name) name = "Freestyle Workout";

  const result = db
    .prepare("INSERT INTO workout_sessions (template_id, name) VALUES (?, ?)")
    .run(templateId, name);
  const sessionId = Number(result.lastInsertRowid);

  // Snapshot the template's exercises so mid-workout edits stay session-local.
  if (templateId) {
    copyTemplateToSession(db, templateId, sessionId);
  }

  const session = db
    .prepare("SELECT * FROM workout_sessions WHERE id = ?")
    .get(sessionId);
  return NextResponse.json(session, { status: 201 });
}
