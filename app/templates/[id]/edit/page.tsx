import { notFound } from "next/navigation";
import TemplateForm from "@/components/TemplateForm";
import { getDb } from "@/lib/db";
import type { Template, TemplateExercise } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({
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
      `SELECT te.* FROM template_exercises te
       WHERE te.template_id = ? ORDER BY te.position ASC`
    )
    .all(id) as TemplateExercise[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit workout</h1>
        <p className="mt-1 text-sm text-zinc-500">{template.name}</p>
      </div>
      <TemplateForm
        templateId={template.id}
        initialName={template.name}
        initialDescription={template.description}
        initialExercises={exercises.map((te) => ({
          exercise_id: te.exercise_id,
          target_sets: te.target_sets,
          target_reps: te.target_reps,
          target_weight: te.target_weight,
          rest_seconds: te.rest_seconds,
          notes: te.notes,
        }))}
      />
    </div>
  );
}
