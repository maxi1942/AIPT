import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  getCardioHistory,
  getExerciseHistory,
  getOverviewStats,
} from "@/lib/stats";

export function GET(req: NextRequest) {
  const exerciseId = req.nextUrl.searchParams.get("exerciseId");
  if (exerciseId) {
    const kind = (
      getDb()
        .prepare("SELECT kind FROM exercises WHERE id = ?")
        .get(Number(exerciseId)) as { kind: string } | undefined
    )?.kind;
    if (kind === "cardio") {
      return NextResponse.json({
        kind: "cardio",
        points: getCardioHistory(Number(exerciseId), 30),
      });
    }
    return NextResponse.json({
      kind: "strength",
      points: getExerciseHistory(Number(exerciseId), 30),
    });
  }
  return NextResponse.json(getOverviewStats());
}
