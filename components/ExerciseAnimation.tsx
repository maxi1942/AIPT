"use client";

import { useEffect, useRef, useState } from "react";
import { getRigForExercise, type Pose, type Rig, type WeightType } from "@/lib/animationRigs";
import { capsulePath, type Pt } from "@/lib/figure";

const SCENERY = "#3f3f46";
const ACCENT = "#34d399";
const IRON = "#2e2e35";
const HUB = "#18181b";

/** Limb radii and body-part category per joint pair (by base joint names). */
interface PairSpec {
  a: string;
  b: string;
  ra: number;
  rb: number;
  category: "torso" | "leg" | "arm" | "foot";
}

const PAIR_SPECS: PairSpec[] = [
  { a: "hip", b: "shoulder", ra: 5.0, rb: 5.6, category: "torso" },
  { a: "hip", b: "knee", ra: 4.4, rb: 3.4, category: "leg" },
  { a: "knee", b: "ankle", ra: 3.2, rb: 2.3, category: "leg" },
  { a: "ankle", b: "toe", ra: 2.2, rb: 1.9, category: "foot" },
  { a: "shoulder", b: "elbow", ra: 3.1, rb: 2.6, category: "arm" },
  { a: "elbow", b: "hand", ra: 2.5, rb: 2.0, category: "arm" },
  { a: "shoulder", b: "hand", ra: 2.9, rb: 2.0, category: "arm" },
];

/** "kneeF" → "knee", "handL" → "hand", "kneeish" → "knee". */
function baseName(joint: string): string {
  return joint.replace(/ish$/, "").replace(/[FBLRS]$/, "");
}

function specFor(from: string, to: string): PairSpec | null {
  const a = baseName(from);
  const b = baseName(to);
  return (
    PAIR_SPECS.find(
      (s) => (s.a === a && s.b === b) || (s.a === b && s.b === a)
    ) ?? null
  );
}

function easeInOutWithHold(phase: number): number {
  // Ping-pong 0→1→0 with a brief hold at each end so reps read clearly.
  const HOLD = 0.08;
  const half = phase < 0.5 ? phase * 2 : (1 - phase) * 2; // 0..1..0
  const t = Math.min(1, Math.max(0, (half - HOLD) / (1 - 2 * HOLD)));
  return t * t * (3 - 2 * t); // smoothstep
}

function lerpPose(a: Pose, b: Pose, f: number): Pose {
  const out: Pose = {};
  for (const key of Object.keys(a)) {
    const [ax, ay] = a[key];
    const [bx, by] = b[key] ?? a[key];
    out[key] = [ax + (bx - ax) * f, ay + (by - ay) * f];
  }
  return out;
}

/**
 * Looping stylized demonstration of an exercise's movement pattern, drawn as
 * a shaded, volumetric silhouette. Renders nothing if no rig exists.
 */
export default function ExerciseAnimation({
  exerciseName,
}: {
  exerciseName: string;
}) {
  const rig = getRigForExercise(exerciseName);
  if (!rig) return null;
  return <RigPlayer rig={rig} />;
}

function RigPlayer({ rig }: { rig: Rig }) {
  const [pose, setPose] = useState<Pose>(rig.poses[0]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      // Show the mid-point of the movement as a still frame.
      setPose(lerpPose(rig.poses[0], rig.poses[1], 0.5));
      return;
    }

    const durMs = (rig.dur ?? 2.4) * 1000;
    const start = performance.now();
    const tick = (now: number) => {
      const phase = ((now - start) % durMs) / durMs;
      setPose(lerpPose(rig.poses[0], rig.poses[1], easeInOutWithHold(phase)));
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [rig]);

  // Rigs that already draw both legs/arms (suffixed joints like ankleF,
  // handL, ankleS) must not get the automatic far-side duplicate.
  const joints = Object.keys(rig.poses[0]);
  const legsDoubled = joints.some(
    (j) => /[FBLRS]$/.test(j) && ["knee", "ankle", "toe"].includes(baseName(j))
  );
  const armsDoubled = joints.some(
    (j) => /[FBLRS]$/.test(j) && ["elbow", "hand"].includes(baseName(j))
  );

  const torsoLinks: Array<[string, string, PairSpec]> = [];
  const legLinks: Array<[string, string, PairSpec]> = [];
  const armLinks: Array<[string, string, PairSpec]> = [];
  for (const [from, to] of rig.links) {
    const spec = specFor(from, to);
    if (!spec) continue;
    if (spec.category === "torso") torsoLinks.push([from, to, spec]);
    else if (spec.category === "arm") armLinks.push([from, to, spec]);
    else legLinks.push([from, to, spec]);
  }

  const limb = (
    from: string,
    to: string,
    spec: PairSpec,
    fill: string,
    offset: Pt = [0, 0]
  ) => {
    const a = pose[from];
    const b = pose[to];
    if (!a || !b) return null;
    const pa: Pt = [a[0] + offset[0], a[1] + offset[1]];
    const pb: Pt = [b[0] + offset[0], b[1] + offset[1]];
    const aIsA = baseName(from) === spec.a;
    const rFrom = aIsA ? spec.ra : spec.rb;
    const rTo = aIsA ? spec.rb : spec.ra;
    return (
      <path
        key={`${from}-${to}-${offset[0]}`}
        d={capsulePath(pa, pb, rFrom, rTo)}
        fill={fill}
      />
    );
  };

  const head = pose[rig.head];
  const shoulder =
    pose["shoulder"] ?? pose["shoulderL"] ?? pose["shoulderR"] ?? null;

  return (
    <svg viewBox="0 0 100 100" width="150" height="150" aria-hidden>
      <defs>
        <linearGradient id="figNear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e7e7ea" />
          <stop offset="100%" stopColor="#a3a3ad" />
        </linearGradient>
        <linearGradient id="figTorso" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d6d6db" />
          <stop offset="100%" stopColor="#8f8f9a" />
        </linearGradient>
        <linearGradient id="figFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5d5d66" />
          <stop offset="100%" stopColor="#44444c" />
        </linearGradient>
      </defs>

      {rig.staticShapes?.map((shape, i) =>
        shape.type === "line" ? (
          <line
            key={i}
            x1={shape.coords[0]}
            y1={shape.coords[1]}
            x2={shape.coords[2]}
            y2={shape.coords[3]}
            stroke={SCENERY}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ) : (
          <rect
            key={i}
            x={shape.coords[0]}
            y={shape.coords[1]}
            width={shape.coords[2]}
            height={shape.coords[3]}
            rx={1.5}
            fill={SCENERY}
          />
        )
      )}

      {/* far-side limbs, drawn behind the torso for depth */}
      {!armsDoubled &&
        armLinks.map(([f, t, s]) => limb(f, t, s, "url(#figFar)", [-2.6, -0.9]))}
      {!legsDoubled &&
        legLinks.map(([f, t, s]) => limb(f, t, s, "url(#figFar)", [-2.4, -0.7]))}

      {/* torso */}
      {torsoLinks.map(([f, t, s]) => limb(f, t, s, "url(#figTorso)"))}

      {/* neck + head */}
      {head && shoulder && (
        <path
          d={capsulePath(shoulder as Pt, head as Pt, 2.4, 2.0)}
          fill="url(#figTorso)"
        />
      )}
      {head && (
        <circle
          cx={head[0]}
          cy={head[1]}
          r={5.2}
          fill="url(#figNear)"
        />
      )}

      {/* near-side limbs */}
      {legLinks.map(([f, t, s]) => limb(f, t, s, "url(#figNear)"))}
      {armLinks.map(([f, t, s]) => limb(f, t, s, "url(#figNear)"))}

      {/* equipment */}
      {rig.weights?.map((joint) =>
        pose[joint] ? (
          <Equipment
            key={joint}
            at={pose[joint] as Pt}
            type={rig.weightType ?? "plate"}
          />
        ) : null
      )}
    </svg>
  );
}

function Equipment({ at, type }: { at: Pt; type: WeightType }) {
  const [x, y] = at;
  switch (type) {
    case "bigplate":
    case "plate": {
      const r = type === "bigplate" ? 5.6 : 4.2;
      return (
        <g>
          <circle cx={x} cy={y} r={r} fill={IRON} stroke={ACCENT} strokeWidth={1.1} />
          <circle cx={x} cy={y} r={r * 0.28} fill={HUB} />
        </g>
      );
    }
    case "dumbbell":
      return (
        <g>
          <line
            x1={x - 3.4}
            y1={y}
            x2={x + 3.4}
            y2={y}
            stroke="#8f8f9a"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
          <circle cx={x - 3} cy={y} r={2.4} fill={IRON} stroke={ACCENT} strokeWidth={0.7} />
          <circle cx={x + 3} cy={y} r={2.4} fill={IRON} stroke={ACCENT} strokeWidth={0.7} />
        </g>
      );
    case "wheel":
      return (
        <g>
          <circle cx={x} cy={y} r={4} fill="#52525b" stroke={ACCENT} strokeWidth={0.9} />
          <circle cx={x} cy={y} r={1.3} fill={HUB} />
        </g>
      );
    case "handle":
      return <circle cx={x} cy={y} r={1.9} fill={ACCENT} />;
  }
}
