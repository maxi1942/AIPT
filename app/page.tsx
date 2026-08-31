import { getDb } from "@/lib/db";
import { getNextUp } from "@/lib/schedule";
import CoachChat, { type NextUpInfo } from "@/components/CoachChat";
import type { CoachMessage, WorkoutSession } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function CoachPage() {
  const db = getDb();

  const messages = db
    .prepare(
      "SELECT role, content FROM coach_messages ORDER BY created_at ASC, id ASC"
    )
    .all() as Pick<CoachMessage, "role" | "content">[];

  const activeSession = db
    .prepare(
      "SELECT * FROM workout_sessions WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1"
    )
    .get() as WorkoutSession | undefined;

  const hasProfile = !!db
    .prepare("SELECT id FROM user_profile WHERE id = 1")
    .get();

  const nextUpRaw = getNextUp(db);
  const nextUp: NextUpInfo | null = nextUpRaw
    ? {
        templateId: nextUpRaw.template.id,
        name: nextUpRaw.template.name,
        when: nextUpRaw.when,
        exerciseCount: nextUpRaw.template.exercise_count,
        estMinutes: nextUpRaw.template.est_minutes,
      }
    : null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-2xl font-bold">Coach</h1>
        <span className="mt-1 flex h-2 w-2 rounded-full bg-blue-500" />
      </div>
      <CoachChat
        initialMessages={messages}
        nextUp={nextUp}
        activeSession={
          activeSession
            ? { id: activeSession.id, name: activeSession.name }
            : null
        }
        hasProfile={hasProfile}
      />
    </div>
  );
}
