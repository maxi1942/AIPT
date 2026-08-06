import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildTrainerSystemPrompt } from "@/lib/trainer";
import type { ChatMessage, SetLog } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = "claude-opus-5";

/**
 * Chat endpoint. Two modes:
 * - user message: { session_id, message } — persisted, full conversation turn
 * - app event:    { session_id, event: "session_start" | "set_logged", set_id? }
 *   — a synthetic instruction (not persisted) that makes the PT speak up
 *   proactively; only the assistant's reply is stored.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessionId = Number(body.session_id);
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const event = typeof body.event === "string" ? body.event : null;

  if (!sessionId || (!message && !event)) {
    return NextResponse.json(
      { error: "session_id and a message or event are required" },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return NextResponse.json(
      {
        error:
          "The AI trainer is not configured. Set the ANTHROPIC_API_KEY environment variable and restart the server.",
      },
      { status: 503 }
    );
  }

  const db = getDb();
  const session = db
    .prepare("SELECT id FROM workout_sessions WHERE id = ?")
    .get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  let eventInstruction: string | null = null;
  if (event === "session_start") {
    eventInstruction = `SESSION EVENT: The lifter just opened this workout session and is ready to train. As their PT, kick things off (max 4 short sentences):
1. Tell them which exercise to start with (normally the first in today's plan).
2. Give a concrete warm-up recommendation with actual weights, ramping toward a specific working weight based on their history (or help them find a starting weight if there is none).
3. One short line connecting today to their goal. No generic pep talk.`;
  } else if (event === "set_logged") {
    const set = db
      .prepare(
        `SELECT s.*, e.name AS exercise_name
         FROM set_logs s JOIN exercises e ON e.id = s.exercise_id
         WHERE s.id = ? AND s.session_id = ?`
      )
      .get(Number(body.set_id), sessionId) as SetLog | undefined;
    if (!set) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }
    eventInstruction = `SESSION EVENT: The lifter just logged ${set.exercise_name} set ${set.set_number}: ${set.reps} reps x ${set.weight} kg${set.rpe != null ? ` at RPE ${set.rpe}` : ""}. Give instant PT feedback in 1-2 short sentences:
- Judge it against today's target and their history (PR? beat last session? below target?).
- Tell them exactly what to do next: weight/reps for the next set and rest time — or, if that exercise is done, which exercise is next.${set.rpe == null ? `\n- If it changes your call, you may ask how it felt (easy/hard).` : ""}`;
  } else if (event) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }

  // Persist real user turns; event instructions are synthetic and are not
  // stored, so transcripts read as the PT speaking up on their own.
  if (message) {
    db.prepare(
      "INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'user', ?)"
    ).run(sessionId, message);
  }

  const history = db
    .prepare(
      "SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC, id ASC"
    )
    .all(sessionId) as Pick<ChatMessage, "role" | "content">[];

  const messages: Array<{ role: "user" | "assistant"; content: string }> =
    history.map((m) => ({ role: m.role, content: m.content }));
  if (eventInstruction) {
    messages.push({ role: "user", content: eventInstruction });
  }

  const systemPrompt = buildTrainerSystemPrompt(sessionId);
  const client = new Anthropic();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: MODEL,
          max_tokens: 16000,
          // Event reactions must feel instant, like a PT calling out between
          // sets — run them at low effort; real questions get full depth.
          ...(eventInstruction
            ? { output_config: { effort: "low" as const } }
            : {}),
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages,
        });

        messageStream.on("text", (delta) => {
          controller.enqueue(encoder.encode(delta));
        });

        const finalMessage = await messageStream.finalMessage();

        if (finalMessage.stop_reason === "refusal") {
          const note =
            "Sorry, I can't help with that one — let's keep the focus on your training.";
          controller.enqueue(encoder.encode(note));
          db.prepare(
            "INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'assistant', ?)"
          ).run(sessionId, note);
        } else {
          const text = finalMessage.content
            .filter((block) => block.type === "text")
            .map((block) => block.text)
            .join("");
          if (text) {
            db.prepare(
              "INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'assistant', ?)"
            ).run(sessionId, text);
          }
        }
        controller.close();
      } catch (err) {
        const msg =
          err instanceof Anthropic.AuthenticationError
            ? "\n\n[The AI trainer could not authenticate — check your ANTHROPIC_API_KEY.]"
            : err instanceof Anthropic.RateLimitError
              ? "\n\n[The AI trainer is rate limited right now — try again in a moment.]"
              : "\n\n[The AI trainer hit an unexpected error — please try again.]";
        controller.enqueue(encoder.encode(msg));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
