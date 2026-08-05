import TemplateForm from "@/components/TemplateForm";

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Design a workout</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Pick exercises, set your targets, and save it as a reusable workout.
        </p>
      </div>
      <TemplateForm />
    </div>
  );
}
