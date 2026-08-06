# AIPT — AI Personal Trainer

Design your standard workouts, run them live with set-by-set logging, and get real-time coaching from an AI trainer that knows your entire training history.

## Features

- **Profile & auto-generated plan** — pick your goal (muscle size, fat loss, strength, maintain), experience, training days, and equipment; AIPT generates a suggested weekly plan (full-body / push-pull-legs / upper-lower split, rep schemes matched to your goal) as ordinary editable workouts, and tunes the AI trainer's coaching to your goal.
- **Workout designer** — build reusable workout templates from a seeded exercise library (or add your own exercises), with target sets, reps, weight, and rest per exercise.
- **Live workout sessions** — start any workout and log reps, weight, and optional RPE set by set. Adjust the session as you go: swap any exercise for another from the library, add, remove, and reorder — without touching the saved design. An elapsed timer keeps you honest.
- **Proactive AI trainer** — a Claude-powered coach leads the session like a real PT: it greets you with what to start with and a concrete warm-up ramp, reacts instantly after every logged set ("8 × 80 kg beats last week — add 2.5 kg next set, rest 2 min"), and coaches to your profile goal with evidence-based programming rules. It sees your plan, every set logged today, and your per-exercise history. Quick-reply chips ("felt easy/hard") keep the loop tight, transcripts are saved per session.
- **History** — every session with its sets, per-exercise best sets, and the trainer chat transcript.
- **Stats** — weekly training volume, and per-exercise progression charts (estimated 1RM and session volume over time) with a data-table view.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — zero-setup local persistence in `data/aipt.db`
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) — Claude Opus 5 powers the trainer chat

## Getting started

```bash
npm install
cp .env.example .env   # add your Anthropic API key
npm run dev
```

Open http://localhost:3000.

The app works fully without an API key **except** the AI trainer chat, which needs `ANTHROPIC_API_KEY` set (get one at https://platform.claude.com/).

## Running it on your phone

The app is a normal web app — once it's reachable over the network, open it in your phone's browser and use "Add to Home Screen" for an app-like experience.

**Option A — quickest (same Wi-Fi, no deployment):** run it on your computer and open it from your phone:

```bash
npm run dev -- -H 0.0.0.0
```

Then visit `http://<your-computer's-LAN-IP>:3000` on the phone (find the IP with `ipconfig` / `ifconfig`).

**Option B — deploy it (works anywhere):** the app needs a Node server **and a persistent disk** for the SQLite database, so pick a host that offers both — Railway, Fly.io, Render, or any VPS. A production `Dockerfile` is included:

```bash
docker build -t aipt .
docker run -p 3000:3000 -v aipt-data:/app/data -e ANTHROPIC_API_KEY=sk-ant-... aipt
```

On Railway/Fly/Render: connect the GitHub repo, point it at your deploy branch (they auto-detect the Dockerfile), attach a volume mounted at `/app/data`, and set the `ANTHROPIC_API_KEY` environment variable.

> ⚠️ **GitHub Pages won't work** (it only serves static files — this app has a server and API routes). **Vercel/Netlify serverless will lose your data** on every deploy because the filesystem is ephemeral; if you specifically want Vercel, the SQLite layer needs swapping for a hosted database (e.g. Turso or Postgres) first.

## How the AI trainer works

Each chat request builds a grounding context straight from the database:

1. The current session's plan (exercises, target sets/reps/weights).
2. Every set logged so far in the live session.
3. Per-exercise history for everything in today's workout — per past session: set count, total volume, top set, and Epley-estimated 1RM.
4. Overall training summary (session frequency, lifetime volume).

That context becomes the system prompt (cached via prompt caching), the full per-session chat history is replayed, and the reply is streamed token-by-token to the workout screen. Transcripts persist per session.

## Data model

```
exercises            seeded library + user-added custom exercises
templates            workout designs
template_exercises   exercises in a design, with targets
workout_sessions     live/finished workout instances
set_logs             individual sets: reps, weight, RPE
chat_messages        per-session trainer chat transcript
```

The SQLite database is created and migrated automatically on first run; delete `data/aipt.db` to reset.
