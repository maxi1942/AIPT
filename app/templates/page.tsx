import Link from "next/link";
import { getDb } from "@/lib/db";
import StartWorkoutButton from "@/components/StartWorkoutButton";
import DeleteTemplateButton from "@/components/DeleteTemplateButton";
import type { Template, TemplateExercise } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function TemplatesPage() {
  const db = getDb();
  const templates = db
    .prepare("SELECT * FROM templates ORDER BY created_at DESC")
    .all() as Template[];

  const exercisesByTemplate = new Map<number, TemplateExercise[]>();
  const allExercises = db
    .prepare(
      `SELECT te.*, e.name AS exercise_name
       FROM template_exercises te
       JOIN exercises e ON e.id = te.exercise_id
       ORDER BY te.template_id, te.position`
    )
    .all() as TemplateExercise[];
  for (const te of allExercises) {
    const list = exercisesByTemplate.get(te.template_id) ?? [];
    list.push(te);
    exercisesByTemplate.set(te.template_id, list);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Your standard workout designs. Start one to begin a live session.
          </p>
        </div>
        <Link
          href="/templates/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          + New workout
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
          No workouts designed yet.
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((t) => {
            const exercises = exercisesByTemplate.get(t.id) ?? [];
            return (
              <div
                key={t.id}
                className="rounded-lg border border-zinc-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{t.name}</h2>
                    {t.description && (
                      <p className="mt-1 text-sm text-zinc-500">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StartWorkoutButton templateId={t.id} />
                    <Link
                      href={`/templates/${t.id}/edit`}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
                    >
                      Edit
                    </Link>
                    <DeleteTemplateButton templateId={t.id} />
                  </div>
                </div>
                <ul className="mt-4 space-y-1.5">
                  {exercises.map((te) => (
                    <li
                      key={te.id}
                      className="flex items-center justify-between rounded-md bg-zinc-100/80 px-3 py-2 text-sm"
                    >
                      <span>{te.exercise_name}</span>
                      <span className="text-zinc-500">
                        {te.target_sets} × {te.target_reps}
                        {te.target_weight != null
                          ? ` @ ${te.target_weight} kg`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
