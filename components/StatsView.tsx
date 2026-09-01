"use client";

import { useEffect, useState } from "react";
import { BarChart, LineChart } from "./charts";
import { durationStr, paceStr } from "@/lib/cardio";
import type { ExerciseHistoryPoint } from "@/lib/types";
import type { CardioHistoryPoint, OverviewStats } from "@/lib/stats";

interface ExerciseOption {
  exercise_id: number;
  name: string;
  sets: number;
  kind: "strength" | "cardio";
}

type HistoryResponse =
  | { kind: "strength"; points: ExerciseHistoryPoint[] }
  | { kind: "cardio"; points: CardioHistoryPoint[] };

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
  const [history, setHistory] = useState<HistoryResponse | null>(null);
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
          <span className="text-sm font-normal text-zinc-500">
            (last 12 weeks, kg)
          </span>
        </h2>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <BarChart
            data={overview.volumeByWeek.map((w) => ({
              label: `wk ${w.week.slice(5)}`,
              value: w.volume,
            }))}
            unit="kg"
          />
        </div>
      </section>

      {overview.cardioMinutesByWeek.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            Weekly cardio{" "}
            <span className="text-sm font-normal text-zinc-500">
              (last 12 weeks, minutes)
            </span>
          </h2>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <BarChart
              data={overview.cardioMinutesByWeek.map((w) => ({
                label: `wk ${w.week.slice(5)}`,
                value: w.minutes,
              }))}
              unit="min"
              color="#d97706"
            />
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Exercise progression</h2>
          <select
            value={selected ?? ""}
            onChange={(e) => setSelected(Number(e.target.value))}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            {exerciseOptions.map((e) => (
              <option key={e.exercise_id} value={e.exercise_id}>
                {e.name} ({e.sets} {e.kind === "cardio" ? "efforts" : "sets"}{" "}
                logged)
              </option>
            ))}
          </select>
        </div>

        {exerciseOptions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
            Log some sets and your progression charts will appear here.
          </div>
        ) : loading || !history ? (
          <div className="py-10 text-center text-zinc-500">Loading…</div>
        ) : history.kind === "cardio" ? (
          <CardioProgression name={selectedName} points={history.points} />
        ) : (
          <StrengthProgression
            name={selectedName}
            points={history.points}
            showTable={showTable}
            onToggleTable={() => setShowTable((v) => !v)}
          />
        )}
      </section>
    </div>
  );
}

function StrengthProgression({
  name,
  points,
  showTable,
  onToggleTable,
}: {
  name: string;
  points: ExerciseHistoryPoint[];
  showTable: boolean;
  onToggleTable: () => void;
}) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-medium text-zinc-700">
            Estimated 1RM — {name}{" "}
            <span className="font-normal text-zinc-500">(kg, Epley)</span>
          </h3>
          <LineChart
            data={points.map((p) => ({
              label: p.date.slice(0, 10),
              value: p.est_1rm,
            }))}
            unit="kg"
          />
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-medium text-zinc-700">
            Session volume — {name}{" "}
            <span className="font-normal text-zinc-500">(kg)</span>
          </h3>
          <BarChart
            data={points.map((p) => ({
              label: p.date.slice(0, 10),
              value: p.total_volume,
            }))}
            unit="kg"
          />
        </div>
      </div>

      {points.length > 0 && (
        <div className="mt-4">
          <button
            onClick={onToggleTable}
            className="text-sm text-blue-700 hover:text-blue-600"
          >
            {showTable ? "Hide data table" : "View as table"}
          </button>
          {showTable && (
            <div className="mt-2 overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full text-sm">
                <thead className="bg-white text-left text-xs text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Sets</th>
                    <th className="px-3 py-2">Top set</th>
                    <th className="px-3 py-2">Est. 1RM (kg)</th>
                    <th className="px-3 py-2">Volume (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 tabular-nums">
                  {[...points].reverse().map((p) => (
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
    </>
  );
}

function CardioProgression({
  name,
  points,
}: {
  name: string;
  points: CardioHistoryPoint[];
}) {
  const hasDistance = points.some((p) => p.distance_km > 0);
  const hasHr = points.some((p) => p.avg_hr != null);
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-medium text-zinc-700">
            Duration — {name}{" "}
            <span className="font-normal text-zinc-500">(minutes)</span>
          </h3>
          <BarChart
            data={points.map((p) => ({
              label: p.date.slice(0, 10),
              value: Math.round(p.duration_seconds / 60),
            }))}
            unit="min"
            color="#d97706"
          />
        </div>
        {hasDistance ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-medium text-zinc-700">
              Distance — {name}{" "}
              <span className="font-normal text-zinc-500">(km)</span>
            </h3>
            <LineChart
              data={points.map((p) => ({
                label: p.date.slice(0, 10),
                value: Math.round(p.distance_km * 10) / 10,
              }))}
              unit="km"
            />
          </div>
        ) : hasHr ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-medium text-zinc-700">
              Average heart rate — {name}{" "}
              <span className="font-normal text-zinc-500">(bpm)</span>
            </h3>
            <LineChart
              data={points
                .filter((p) => p.avg_hr != null)
                .map((p) => ({
                  label: p.date.slice(0, 10),
                  value: p.avg_hr as number,
                }))}
              unit="bpm"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-white text-left text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Distance</th>
              <th className="px-3 py-2">Pace</th>
              <th className="px-3 py-2">Avg HR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 tabular-nums">
            {[...points].reverse().map((p) => (
              <tr key={p.session_id}>
                <td className="px-3 py-2">{p.date.slice(0, 10)}</td>
                <td className="px-3 py-2">{durationStr(p.duration_seconds)}</td>
                <td className="px-3 py-2">
                  {p.distance_km > 0 ? `${p.distance_km} km` : "—"}
                </td>
                <td className="px-3 py-2">
                  {paceStr(p.distance_km, p.duration_seconds) ?? "—"}
                </td>
                <td className="px-3 py-2">{p.avg_hr ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
