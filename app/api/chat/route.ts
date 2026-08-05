import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildTrainerSystemPrompt } from "@/lib/trainer";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = "claude-opus-5";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessionId = Number(body.session_id);
  const message = String(body.message ?? "").trim();

  if (!sessionId || !message) {
    return NextResponse.json(
      { error: "session_id and message are required" },
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

  // Persist the user turn, then rebuild the full conversation from the DB so
  // the model always sees the complete history for this workout.
  db.prepare(
    "INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'user', ?)"
  ).run(sessionId, message);

  const history = db
    .prepare(
      "SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC, id ASC"
    )
    .all(sessionId) as Pick<ChatMessage, "role" | "content">[];

  const systemPrompt = buildTrainerSystemPrompt(sessionId);
  const client = new Anthropic();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: MODEL,
          max_tokens: 16000,
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: history.map((m) => ({
            role: m.role,
            content: m.content,
          })),
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
