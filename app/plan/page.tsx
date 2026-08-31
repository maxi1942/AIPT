import Link from "next/link";
import { getDb } from "@/lib/db";
import { getNextUp, getWeekPlan } from "@/lib/schedule";
import PlanMenu from "@/components/PlanMenu";
import StartWorkoutButton from "@/components/StartWorkoutButton";

export const dynamic = "force-dynamic";

export default function PlanPage() {
  const db = getDb();
  const week = getWeekPlan(db);
  const nextUp = getNextUp(db);
  const hasProfile = !!db
    .prepare("SELECT id FROM user_profile WHERE id = 1")
    .get();
  const hasTemplates = week.some((d) => d.workouts.length > 0);
  const unscheduled = db
    .prepare(
      `SELECT t.id, t.name, COUNT(te.id) AS exercise_count
       FROM templates t
       LEFT JOIN template_exercises te ON te.template_id = t.id
       WHERE t.weekday IS NULL
       GROUP BY t.id
       ORDER BY t.created_at DESC`
    )
    .all() as Array<{ id: number; name: string; exercise_count: number }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Plan</h1>
        <PlanMenu />
      </div>

      {nextUp ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Next up
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
              {nextUp.when}
            </span>
          </div>
          <Link
            href={`/templates/${nextUp.template.id}`}
            className="mt-1 block text-lg font-semibold hover:text-blue-700"
          >
            {nextUp.template.name}
          </Link>
          <div className="mt-0.5 text-sm text-zinc-500">
            {nextUp.template.exercise_count} exercises · ~
            {nextUp.template.est_minutes} min
          </div>
          <div className="mt-4 flex gap-2">
            <StartWorkoutButton
              templateId={nextUp.template.id}
              className="grow rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            />
            <Link
              href={`/templates/${nextUp.template.id}`}
              className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Details
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center">
          <p className="text-sm text-zinc-500">
            {hasTemplates
              ? "No workouts are scheduled on a weekday yet — edit a workout to give it a day."
              : hasProfile
                ? "No workouts yet — generate a plan from your profile or design one yourself."
                : "Set up your profile and AIPT will generate a weekly plan around your goal."}
          </p>
          <Link
            href={hasProfile ? "/templates" : "/profile"}
            className="mt-4 inline-block rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            {hasProfile ? "Manage workouts" : "Set up profile"}
          </Link>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">This week</h2>
        <div className="space-y-2">
          {week.map((day) => (
            <div
              key={day.weekday}
              className={`rounded-2xl border px-4 py-3 ${
                day.isToday
                  ? "border-blue-200 bg-blue-50/60"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {day.label}
                  {day.isToday && (
                    <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                      Today
                    </span>
                  )}
                </div>
              </div>
              {day.workouts.length === 0 ? (
                <div className="mt-1 text-sm text-zinc-400">Rest day</div>
              ) : (
                day.workouts.map((w) => (
                  <Link
                    key={w.id}
                    href={`/templates/${w.id}`}
                    className="mt-1 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">
                        {w.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {w.exercise_count} exercises · ~{w.est_minutes} min
                      </div>
                    </div>
                    <span className="text-zinc-400" aria-hidden>
                      ›
                    </span>
                  </Link>
                ))
              )}
            </div>
          ))}
        </div>
      </section>

      {unscheduled.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Not scheduled</h2>
          <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
            {unscheduled.map((t) => (
              <Link
                key={t.id}
                href={`/templates/${t.id}`}
                className="flex items-center justify-between px-4 py-3 transition hover:bg-zinc-50"
              >
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-zinc-500">
                    {t.exercise_count} exercise
                    {t.exercise_count === 1 ? "" : "s"}
                  </div>
                </div>
                <span className="text-zinc-400" aria-hidden>
                  ›
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
