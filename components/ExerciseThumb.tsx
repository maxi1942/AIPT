"use client";

import ExerciseAnimation from "./ExerciseAnimation";
import { getRigForExercise } from "@/lib/animationRigs";
import { cardioEmoji } from "@/lib/cardio";

/**
 * Animated thumbnail when the exercise has a movement rig; an emoji glyph
 * otherwise (cardio modes and custom exercises have no rig).
 */
export default function ExerciseThumb({
  exerciseName,
  size,
}: {
  exerciseName: string;
  size: number;
}) {
  if (getRigForExercise(exerciseName)) {
    return <ExerciseAnimation exerciseName={exerciseName} size={size} />;
  }
  return (
    <span
      style={{ fontSize: size * 0.5, lineHeight: 1 }}
      role="img"
      aria-label={exerciseName}
    >
      {cardioEmoji(exerciseName)}
    </span>
  );
}
