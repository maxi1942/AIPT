"use client";

import { useEffect, useRef, useState } from "react";
import { getRigForExercise, type Pose, type Rig } from "@/lib/animationRigs";

const LIMB = "#a1a1aa";
const SCENERY = "#3f3f46";
const WEIGHT = "#34d399";

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
 * Looping stylized demonstration of an exercise's movement pattern.
 * Renders nothing if no rig exists for the exercise.
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

  return (
    <svg viewBox="0 0 100 100" width="150" height="150" aria-hidden>
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

      {rig.links.map(([from, to], i) => {
        const a = pose[from];
        const b = pose[to];
        if (!a || !b) return null;
        return (
          <line
            key={i}
            x1={a[0]}
            y1={a[1]}
            x2={b[0]}
            y2={b[1]}
            stroke={LIMB}
            strokeWidth={3.5}
            strokeLinecap="round"
          />
        );
      })}

      {pose[rig.head] && (
        <circle
          cx={pose[rig.head][0]}
          cy={pose[rig.head][1]}
          r={5.5}
          fill={LIMB}
        />
      )}

      {rig.weights?.map((joint) =>
        pose[joint] ? (
          <circle
            key={joint}
            cx={pose[joint][0]}
            cy={pose[joint][1]}
            r={4}
            fill={WEIGHT}
          />
        ) : null
      )}
    </svg>
  );
}
