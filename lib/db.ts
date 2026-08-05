import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "aipt.db");

declare global {
  // eslint-disable-next-line no-var
  var __aiptDb: Database.Database | undefined;
}

function createDb(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      muscle_group TEXT NOT NULL,
      equipment TEXT NOT NULL DEFAULT 'other',
      is_custom INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS template_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id),
      position INTEGER NOT NULL,
      target_sets INTEGER NOT NULL DEFAULT 3,
      target_reps TEXT NOT NULL DEFAULT '8-12',
      target_weight REAL,
      rest_seconds INTEGER NOT NULL DEFAULT 90,
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS set_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id),
      set_number INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight REAL NOT NULL DEFAULT 0,
      rpe REAL,
      logged_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_set_logs_session ON set_logs(session_id);
    CREATE INDEX IF NOT EXISTS idx_set_logs_exercise ON set_logs(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id);
  `);

  seedExercises(db);
}

const SEED_EXERCISES: Array<[string, string, string]> = [
  // Chest
  ["Barbell Bench Press", "Chest", "barbell"],
  ["Incline Dumbbell Press", "Chest", "dumbbell"],
  ["Dumbbell Bench Press", "Chest", "dumbbell"],
  ["Cable Fly", "Chest", "cable"],
  ["Push-Up", "Chest", "bodyweight"],
  ["Dips", "Chest", "bodyweight"],
  // Back
  ["Deadlift", "Back", "barbell"],
  ["Pull-Up", "Back", "bodyweight"],
  ["Chin-Up", "Back", "bodyweight"],
  ["Barbell Row", "Back", "barbell"],
  ["Dumbbell Row", "Back", "dumbbell"],
  ["Lat Pulldown", "Back", "machine"],
  ["Seated Cable Row", "Back", "cable"],
  ["Face Pull", "Back", "cable"],
  // Legs
  ["Barbell Back Squat", "Legs", "barbell"],
  ["Front Squat", "Legs", "barbell"],
  ["Romanian Deadlift", "Legs", "barbell"],
  ["Leg Press", "Legs", "machine"],
  ["Walking Lunge", "Legs", "dumbbell"],
  ["Bulgarian Split Squat", "Legs", "dumbbell"],
  ["Leg Extension", "Legs", "machine"],
  ["Leg Curl", "Legs", "machine"],
  ["Hip Thrust", "Legs", "barbell"],
  ["Standing Calf Raise", "Legs", "machine"],
  // Shoulders
  ["Overhead Press", "Shoulders", "barbell"],
  ["Seated Dumbbell Press", "Shoulders", "dumbbell"],
  ["Lateral Raise", "Shoulders", "dumbbell"],
  ["Rear Delt Fly", "Shoulders", "dumbbell"],
  ["Arnold Press", "Shoulders", "dumbbell"],
  // Arms
  ["Barbell Curl", "Arms", "barbell"],
  ["Dumbbell Curl", "Arms", "dumbbell"],
  ["Hammer Curl", "Arms", "dumbbell"],
  ["Preacher Curl", "Arms", "machine"],
  ["Triceps Pushdown", "Arms", "cable"],
  ["Skull Crusher", "Arms", "barbell"],
  ["Overhead Triceps Extension", "Arms", "cable"],
  // Core
  ["Plank", "Core", "bodyweight"],
  ["Hanging Leg Raise", "Core", "bodyweight"],
  ["Cable Crunch", "Core", "cable"],
  ["Ab Wheel Rollout", "Core", "other"],
  // Cardio / full body
  ["Kettlebell Swing", "Full Body", "kettlebell"],
  ["Clean and Press", "Full Body", "barbell"],
  ["Farmer's Carry", "Full Body", "dumbbell"],
];

function seedExercises(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) AS n FROM exercises").get() as {
    n: number;
  };
  if (count.n > 0) return;
  const insert = db.prepare(
    "INSERT OR IGNORE INTO exercises (name, muscle_group, equipment, is_custom) VALUES (?, ?, ?, 0)"
  );
  const tx = db.transaction(() => {
    for (const [name, group, equipment] of SEED_EXERCISES) {
      insert.run(name, group, equipment);
    }
  });
  tx();
}

export function getDb(): Database.Database {
  if (!globalThis.__aiptDb) {
    globalThis.__aiptDb = createDb();
  }
  return globalThis.__aiptDb;
}
