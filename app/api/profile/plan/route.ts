import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generatePlan } from "@/lib/planGenerator";
import type { UserProfile } from "@/lib/types";

export function POST() {
  const db = getDb();
  const profile = db
    .prepare("SELECT * FROM user_profile WHERE id = 1")
    .get() as UserProfile | undefined;

  if (!profile) {
    return NextResponse.json(
      { error: "Save your profile first" },
      { status: 400 }
    );
  }

  const summary = generatePlan(db, profile);
  return NextResponse.json(summary, { status: 201 });
}
