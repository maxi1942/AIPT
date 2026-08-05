"use client";

import { useEffect, useState } from "react";
import { BarChart, LineChart } from "./charts";
import type { ExerciseHistoryPoint } from "@/lib/types";
import type { OverviewStats } from "@/lib/stats";

interface ExerciseOption {
  exercise_id: number;
  name: string;
  sets: number;
}

export default function StatsView({
  overview,
  exerciseOptions,
}: {
  overview: OverviewStats;
  exerciseOptions: ExerciseOption[];
}) {
  const [selected, setSelected] = useState<number | null>(
    exerciseOptions[0]?.exercise_id ?? null
  );
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    if (selected == null) return;
    setLoading(true);
    fetch(`/api/stats?exerciseId=${selected}`)
      .then((r) => r.json())
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [selected]);

  const selectedName =
    exerciseOptions.find((e) => e.exercise_id === selected)?.name ?? "";

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Weekly training volume{" "}
          <span className="text-sm font-normal text-zinc-400">
            (last 12 weeks, kg)
          </span>
        </h2>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <BarChart
            data={overview.volumeByWeek.map((w) => ({
              label: `wk ${w.week.slice(5)}`,
              value: w.volume,
            }))}
            unit="kg"
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Exercise progression</h2>
          <select
            value={selected ?? ""}
            onChange={(e) => setSelected(Number(e.target.value))}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
          >
            {exerciseOptions.map((e) => (
              <option key={e.exercise_id} value={e.exercise_id}>
                {e.name} ({e.sets} sets logged)
              </option>
            ))}
          </select>
        </div>

        {exerciseOptions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-700 p-10 text-center text-zinc-400">
            Log some sets and your progression charts will appear here.
          </div>
        ) : loading ? (
          <div className="py-10 text-center text-zinc-500">Loading…</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="mb-2 text-sm font-medium text-zinc-300">
                Estimated 1RM — {selectedName}{" "}
                <span className="font-normal text-zinc-500">(kg, Epley)</span>
              </h3>
              <LineChart
                data={history.map((p) => ({
                  label: p.date.slice(0, 10),
                  value: p.est_1rm,
                }))}
                unit="kg"
              />
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="mb-2 text-sm font-medium text-zinc-300">
                Session volume — {selectedName}{" "}
                <span className="font-normal text-zinc-500">(kg)</span>
              </h3>
              <BarChart
                data={history.map((p) => ({
                  label: p.date.slice(0, 10),
                  value: p.total_volume,
                }))}
                unit="kg"
              />
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowTable((v) => !v)}
              className="text-sm text-emerald-300 hover:text-emerald-200"
            >
              {showTable ? "Hide data table" : "View as table"}
            </button>
            {showTable && (
              <div className="mt-2 overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900 text-left text-xs text-zinc-400">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Sets</th>
                      <th className="px-3 py-2">Top set</th>
                      <th className="px-3 py-2">Est. 1RM (kg)</th>
                      <th className="px-3 py-2">Volume (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 tabular-nums">
                    {[...history].reverse().map((p) => (
                      <tr key={p.session_id}>
                        <td className="px-3 py-2">{p.date.slice(0, 10)}</td>
                        <td className="px-3 py-2">{p.sets}</td>
                        <td className="px-3 py-2">
                          {p.top_reps} × {p.top_weight} kg
                        </td>
                        <td className="px-3 py-2">{p.est_1rm}</td>
                        <td className="px-3 py-2">
                          {p.total_volume.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
