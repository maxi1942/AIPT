import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import StartWorkoutButton from "@/components/StartWorkoutButton";
import TemplateExerciseList from "@/components/TemplateExerciseList";
import { WEEKDAY_LABELS } from "@/lib/types";
import type { Exercise, Template, TemplateExercise } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();
  const template = db
    .prepare("SELECT * FROM templates WHERE id = ?")
    .get(id) as Template | undefined;
  if (!template) notFound();

  const exercises = db
    .prepare(
      `SELECT te.*, e.name AS exercise_name, e.muscle_group, e.equipment
       FROM template_exercises te
       JOIN exercises e ON e.id = te.exercise_id
       WHERE te.template_id = ?
       ORDER BY te.position ASC`
    )
    .all(id) as TemplateExercise[];

  const library = db
    .prepare("SELECT * FROM exercises ORDER BY name ASC")
    .all() as Exercise[];

  const totalSets = exercises.reduce((sum, e) => sum + e.target_sets, 0);
  const estSeconds = exercises.reduce(
    (sum, e) => sum + e.target_sets * (e.rest_seconds + 45),
    0
  );
  const estMinutes = Math.max(10, Math.round(estSeconds / 60 / 5) * 5);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/plan"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
        >
          ← Plan
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{template.name}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {exercises.length} exercises · {totalSets} sets · ~{estMinutes}{" "}
              min
            </p>
          </div>
          {template.weekday !== null && (
            <span className="mt-1 shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
              {WEEKDAY_LABELS[template.weekday]}s
            </span>
          )}
        </div>
        {template.description && (
          <p className="mt-2 text-sm text-zinc-500">{template.description}</p>
        )}
      </div>

      <div className="flex gap-2">
        <StartWorkoutButton
          templateId={template.id}
          className="grow rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
        />
        <Link
          href={`/templates/${template.id}/edit`}
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Edit
        </Link>
      </div>

      {exercises.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
          No exercises in this workout yet —{" "}
          <Link
            href={`/templates/${template.id}/edit`}
            className="font-medium text-blue-700 hover:text-blue-600"
          >
            add some
          </Link>
          .
        </div>
      ) : (
        <TemplateExerciseList
          templateId={template.id}
          exercises={exercises}
          library={library}
        />
      )}
    </div>
  );
}
