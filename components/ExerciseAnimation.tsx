"use client";

import { useEffect, useRef, useState } from "react";
import { getRigForExercise, type Pose, type Rig, type WeightType } from "@/lib/animationRigs";
import { capsulePath, type Pt } from "@/lib/figure";

const SCENERY = "#a1a1aa";
const ACCENT = "#ef4444";
const IRON = "#3f3f46";
const HUB = "#fafafa";

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
  size = 150,
}: {
  exerciseName: string;
  size?: number;
}) {
  const rig = getRigForExercise(exerciseName);
  if (!rig) return null;
  return <RigPlayer rig={rig} size={size} />;
}

function RigPlayer({ rig, size = 150 }: { rig: Rig; size?: number }) {
  const [frame, setFrame] = useState<{ pose: Pose; f: number }>({
    pose: rig.poses[0],
    f: 0,
  });
  const frameRef = useRef<number>(0);
  const pose = frame.pose;

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      // Show the mid-point of the movement as a still frame.
      setFrame({ pose: lerpPose(rig.poses[0], rig.poses[1], 0.5), f: 0.5 });
      return;
    }

    const durMs = (rig.dur ?? 2.4) * 1000;
    const start = performance.now();
    const tick = (now: number) => {
      const phase = ((now - start) % durMs) / durMs;
      const f = easeInOutWithHold(phase);
      setFrame({ pose: lerpPose(rig.poses[0], rig.poses[1], f), f });
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

  // Ground shadow under the figure, only for rigs standing on the floor line.
  const hasFloor = rig.staticShapes?.some(
    (s) => s.type === "line" && s.coords[1] === 91 && s.coords[3] === 91
  );
  const xs = Object.values(pose).map((p) => p[0]);
  const shadowCx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const shadowRx = Math.max(9, (Math.max(...xs) - Math.min(...xs)) * 0.55);

  // Trajectory of the load between the two keyframes (the "bar path" line).
  const pathJoint = rig.weights?.[0];
  const pathA = pathJoint ? rig.poses[0][pathJoint] : null;
  const pathB = pathJoint ? rig.poses[1][pathJoint] : null;
  const showBarPath =
    pathA && pathB && Math.hypot(pathB[0] - pathA[0], pathB[1] - pathA[1]) > 8;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id="figNear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#82828c" />
          <stop offset="100%" stopColor="#54545e" />
        </linearGradient>
        <linearGradient id="figTorso" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9d9da6" />
          <stop offset="100%" stopColor="#6e6e78" />
        </linearGradient>
        <linearGradient id="figFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d6d6db" />
          <stop offset="100%" stopColor="#bcbcc4" />
        </linearGradient>
        <radialGradient id="figGlow">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.85" />
          <stop offset="55%" stopColor={ACCENT} stopOpacity="0.35" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </radialGradient>
      </defs>

      {hasFloor && (
        <ellipse
          cx={shadowCx}
          cy={91.6}
          rx={shadowRx}
          ry={1.9}
          fill="#000"
          opacity={0.12}
        />
      )}

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

      {/* working-muscle glow, pulsing with exertion */}
      {rig.glows?.map((glow, i) => {
        const a = pose[glow.a];
        const b = pose[glow.b];
        if (!a || !b) return null;
        const gx = a[0] + (b[0] - a[0]) * glow.t;
        const gy = a[1] + (b[1] - a[1]) * glow.t;
        return (
          <circle
            key={i}
            cx={gx}
            cy={gy}
            r={glow.r * (1 + 0.18 * frame.f)}
            fill="url(#figGlow)"
            opacity={0.45 + 0.5 * frame.f}
          />
        );
      })}

      {/* bar path of the load between the two keyframes */}
      {showBarPath && pathA && pathB && (
        <line
          x1={pathA[0]}
          y1={pathA[1]}
          x2={pathB[0]}
          y2={pathB[1]}
          stroke={ACCENT}
          strokeWidth={0.9}
          strokeDasharray="2.2 2.2"
          strokeLinecap="round"
          opacity={0.4}
        />
      )}

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
            stroke="#6e6e78"
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
          <circle cx={x} cy={y} r={4} fill="#71717a" stroke={ACCENT} strokeWidth={0.9} />
          <circle cx={x} cy={y} r={1.3} fill={HUB} />
        </g>
      );
    case "handle":
      return <circle cx={x} cy={y} r={1.9} fill={ACCENT} />;
  }
}
