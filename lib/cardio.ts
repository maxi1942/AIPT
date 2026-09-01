import type { Goal } from "./types";

/** Heart-rate zones as a fraction of max HR (5-zone model). */
export const ZONES = [
  { id: "Z1", name: "Recovery", low: 0.5, high: 0.6 },
  { id: "Z2", name: "Endurance", low: 0.6, high: 0.7 },
  { id: "Z3", name: "Tempo", low: 0.7, high: 0.8 },
  { id: "Z4", name: "Threshold", low: 0.8, high: 0.9 },
  { id: "Z5", name: "Max effort", low: 0.9, high: 1.0 },
] as const;

export type ZoneId = (typeof ZONES)[number]["id"];

export const ZONE_IDS = ZONES.map((z) => z.id);

/** Age-predicted max heart rate (Tanaka: 208 − 0.7 × age). */
export function hrMax(age: number): number {
  return Math.round(208 - 0.7 * age);
}

/** BPM range for a zone, or null when the zone id is unknown. */
export function zoneBpm(
  zoneId: string,
  age: number
): { low: number; high: number } | null {
  const zone = ZONES.find((z) => z.id === zoneId);
  if (!zone) return null;
  const max = hrMax(age);
  return { low: Math.round(max * zone.low), high: Math.round(max * zone.high) };
}

/** "Z2 (117–137 bpm)" when age is known, "Z2 (Endurance)" otherwise. */
export function zoneLabel(zoneId: string, age?: number | null): string {
  const zone = ZONES.find((z) => z.id === zoneId);
  if (!zone) return zoneId;
  if (age) {
    const bpm = zoneBpm(zoneId, age)!;
    return `${zone.id} (${bpm.low}–${bpm.high} bpm)`;
  }
  return `${zone.id} (${zone.name})`;
}

/** "4:48 /km" from a distance and duration, or null when not computable. */
export function paceStr(
  distanceKm: number | null,
  durationSeconds: number | null
): string | null {
  if (!distanceKm || !durationSeconds || distanceKm <= 0) return null;
  const secPerKm = durationSeconds / distanceKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

/** "32 min" / "1 h 05 min" from seconds. */
export function durationStr(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

/** One-line human summary of a cardio effort. */
export function cardioEffortStr(log: {
  duration_seconds: number | null;
  distance_km: number | null;
  avg_hr: number | null;
}): string {
  const parts: string[] = [];
  if (log.duration_seconds) parts.push(durationStr(log.duration_seconds));
  if (log.distance_km) parts.push(`${log.distance_km} km`);
  const pace = paceStr(log.distance_km, log.duration_seconds);
  if (pace) parts.push(pace);
  if (log.avg_hr) parts.push(`avg ${log.avg_hr} bpm`);
  return parts.join(" · ") || "logged";
}

const EMOJI: Array<[RegExp, string]> = [
  [/run/i, "🏃"],
  [/cycl|bike/i, "🚴"],
  [/row/i, "🚣"],
  [/swim/i, "🏊"],
  [/stair|climb/i, "🧗"],
  [/walk|hike/i, "🚶"],
  [/rope/i, "⏱️"],
];

/** Thumbnail stand-in for cardio exercises, which have no animation rig. */
export function cardioEmoji(name: string): string {
  for (const [re, emoji] of EMOJI) if (re.test(name)) return emoji;
  return "❤️";
}

/** Per-goal cardio programming rules for the AI coach/trainer prompts. */
export const CARDIO_BY_GOAL: Record<Goal, string> = {
  strength: `Cardio for a STRENGTH goal: keep it minimal and low-interference — 1-2 easy Zone 2 sessions of 20-30 min per week (bike, incline walk, rower), ideally on rest days or after lifting, never right before heavy lower-body work. Skip HIIT during heavy strength blocks.`,
  size: `Cardio for a SIZE goal: 1-2 Zone 2 sessions of 20-30 min per week for heart health and work capacity, on rest days or after lifting. Prefer low-impact modes (bike, incline walk) to protect leg recovery; avoid long runs that eat into muscle recovery.`,
  fat_loss: `Cardio for a FAT LOSS goal: it's a key tool alongside the diet deficit. Build up to ~150+ min of Zone 2 per week (e.g. 3-4 x 30-40 min) plus optionally 1 interval session (e.g. 6 x 1 min hard / 2 min easy in Z4-Z5) once base fitness is there. Lifting still comes first in a session — cardio after weights or in separate sessions. Progress duration ~10% per week, not pace.`,
  maintain: `Cardio for a MAINTAIN goal: 2-3 Zone 2 sessions of 20-40 min per week is the sweet spot for health (aim for the WHO's 150 min/week of moderate work). One optional harder session (Z4 intervals) keeps the top end. Any mode they enjoy is the right mode.`,
};

/** Shared explanation of the zone model, personalised when age is known. */
export function zonesPromptBlock(age: number | null | undefined): string {
  const lines = ["## Heart-rate zones (5-zone model)"];
  if (age) {
    lines.push(
      `Estimated max HR (Tanaka, age ${age}): ~${hrMax(age)} bpm. The lifter's zones:`
    );
    for (const z of ZONES) {
      const bpm = zoneBpm(z.id, age)!;
      lines.push(`- ${z.id} ${z.name}: ${bpm.low}–${bpm.high} bpm`);
    }
  } else {
    lines.push(
      "No age on the profile, so give zones as % of max HR (Z1 50-60%, Z2 60-70%, Z3 70-80%, Z4 80-90%, Z5 90-100%) and the talk test (Z2 = can hold a conversation), and suggest adding age to the profile for personal bpm ranges."
    );
  }
  lines.push(
    "Coach cardio by zone and time first, pace second: Zone 2 should feel conversational; if HR drifts above the zone, slow down — that IS the workout. Compare pace at a given HR across sessions to show aerobic progress (same HR, faster pace = fitter)."
  );
  return lines.join("\n");
}
