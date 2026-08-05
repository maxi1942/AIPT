import { NextRequest, NextResponse } from "next/server";
import { getExerciseHistory, getOverviewStats } from "@/lib/stats";

export function GET(req: NextRequest) {
  const exerciseId = req.nextUrl.searchParams.get("exerciseId");
  if (exerciseId) {
    return NextResponse.json(getExerciseHistory(Number(exerciseId), 30));
  }
  return NextResponse.json(getOverviewStats());
}
