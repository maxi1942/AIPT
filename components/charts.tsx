"use client";

import { useRef, useState } from "react";

export interface ChartPoint {
  label: string;
  value: number;
}

const W = 600;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 48 };

function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10]
    .map((m) => m * mag)
    .find((s) => max / s <= 4) ?? mag * 10;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  return ticks;
}

function formatNum(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${Math.round(v / 100) / 10}k`;
  return String(Math.round(v * 10) / 10);
}

/** Single-series line chart with crosshair + tooltip. */
export function LineChart({
  data,
  color = "#7dd3fc",
  unit = "",
}: {
  data: ChartPoint[];
  color?: string;
  unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (data.length === 0) {
    return <EmptyChart />;
  }

  const max = Math.max(...data.map((d) => d.value)) * 1.1 || 1;
  const ticks = niceTicks(max);
  const yMax = ticks[ticks.length - 1];
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (i: number) =>
    PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;

  const path = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`)
    .join(" ");

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let bestDist = Infinity;
    for (let i = 0; i < data.length; i++) {
      const d = Math.abs(x(i) - px);
      if (d < bestDist) {
        bestDist = d;
        nearest = i;
      }
    }
    setHover(nearest);
  }

  const h = hover != null ? data[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="#27272a"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(t) + 4}
              textAnchor="end"
              fontSize={11}
              fill="#71717a"
            >
              {formatNum(t)}
            </text>
          </g>
        ))}

        {data.length > 1 &&
          [0, data.length - 1].map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              textAnchor={i === 0 ? "start" : "end"}
              fontSize={11}
              fill="#71717a"
            >
              {data[i].label}
            </text>
          ))}

        {hover != null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="#52525b"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />

        {data.map((d, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(d.value)}
            r={hover === i ? 5 : data.length <= 20 ? 3 : 0}
            fill={color}
            stroke="#18181b"
            strokeWidth={2}
          />
        ))}
      </svg>

      {h && hover != null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs shadow-lg"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            top: `${(y(h.value) / H) * 100 - 16}%`,
          }}
        >
          <div className="text-zinc-400">{h.label}</div>
          <div className="font-semibold tabular-nums text-zinc-100">
            {h.value.toLocaleString()}
            {unit ? ` ${unit}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}

/** Single-series bar chart with rounded data-ends and hover tooltip. */
export function BarChart({
  data,
  color = "#34d399",
  unit = "",
}: {
  data: ChartPoint[];
  color?: string;
  unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) {
    return <EmptyChart />;
  }

  const max = Math.max(...data.map((d) => d.value)) * 1.1 || 1;
  const ticks = niceTicks(max);
  const yMax = ticks[ticks.length - 1];
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / data.length;
  const barW = Math.min(40, Math.max(6, slot - 2));

  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;

  const h = hover != null ? data[hover] : null;
  const hoverX =
    hover != null ? PAD.left + hover * slot + slot / 2 : 0;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="#27272a"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(t) + 4}
              textAnchor="end"
              fontSize={11}
              fill="#71717a"
            >
              {formatNum(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const bx = PAD.left + i * slot + (slot - barW) / 2;
          const by = y(d.value);
          const height = Math.max(0, H - PAD.bottom - by);
          const r = Math.min(4, barW / 2, height);
          return (
            <g key={i}>
              {/* rounded top, flat baseline */}
              <path
                d={`M${bx},${H - PAD.bottom}
                    L${bx},${by + r}
                    Q${bx},${by} ${bx + r},${by}
                    L${bx + barW - r},${by}
                    Q${bx + barW},${by} ${bx + barW},${by + r}
                    L${bx + barW},${H - PAD.bottom} Z`}
                fill={color}
                opacity={hover === null || hover === i ? 1 : 0.45}
              />
              <rect
                x={PAD.left + i * slot}
                y={PAD.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}

        {data.length > 1 &&
          [0, data.length - 1].map((i) => (
            <text
              key={i}
              x={PAD.left + i * slot + slot / 2}
              y={H - 8}
              textAnchor="middle"
              fontSize={11}
              fill="#71717a"
            >
              {data[i].label}
            </text>
          ))}
      </svg>

      {h && hover != null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs shadow-lg"
          style={{
            left: `${(hoverX / W) * 100}%`,
            top: `${(y(h.value) / H) * 100 - 16}%`,
          }}
        >
          <div className="text-zinc-400">{h.label}</div>
          <div className="font-semibold tabular-nums text-zinc-100">
            {h.value.toLocaleString()}
            {unit ? ` ${unit}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-zinc-500">
      Not enough data yet — log some workouts first.
    </div>
  );
}
