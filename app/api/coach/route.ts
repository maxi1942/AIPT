import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildCoachSystemPrompt } from "@/lib/coach";
import type { CoachMessage } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = "claude-opus-5";

/**
 * Global coach chat (home tab). Two modes, mirroring /api/chat:
 * - user message: { message } — persisted, full conversation turn
 * - app event:    { event: "welcome" } — synthetic instruction (not persisted)
 *   that makes the coach open the conversation; only its reply is stored.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const event = typeof body.event === "string" ? body.event : null;

  if (!message && !event) {
    return NextResponse.json(
      { error: "A message or event is required" },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return NextResponse.json(
      {
        error:
          "The AI coach is not configured. Set the ANTHROPIC_API_KEY environment variable and restart the server.",
      },
      { status: 503 }
    );
  }

  let eventInstruction: string | null = null;
  if (event === "welcome") {
    eventInstruction = `SESSION EVENT: The lifter just opened the app and this is the start of your conversation. Welcome them like their PT (max 4 short sentences):
1. A short, warm greeting.
2. Point at what's next in their week: today's scheduled workout if there is one (name it and suggest starting it), otherwise the next scheduled day — or, if nothing is scheduled, suggest setting up their profile / plan.
3. Invite them to ask anything or to adjust the week. No generic pep talk.`;
  } else if (event) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }

  const db = getDb();

  // Persist real user turns; event instructions are synthetic and are not
  // stored, so the transcript reads as the coach speaking up on their own.
  if (message) {
    db.prepare(
      "INSERT INTO coach_messages (role, content) VALUES ('user', ?)"
    ).run(message);
  }

  const history = db
    .prepare(
      "SELECT role, content FROM coach_messages ORDER BY created_at ASC, id ASC"
    )
    .all() as Pick<CoachMessage, "role" | "content">[];

  const messages: Array<{ role: "user" | "assistant"; content: string }> =
    history.map((m) => ({ role: m.role, content: m.content }));
  if (eventInstruction) {
    messages.push({ role: "user", content: eventInstruction });
  }

  const systemPrompt = buildCoachSystemPrompt();
  const client = new Anthropic();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: MODEL,
          max_tokens: 16000,
          // The welcome must feel instant when the app opens.
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
            "INSERT INTO coach_messages (role, content) VALUES ('assistant', ?)"
          ).run(note);
        } else {
          const text = finalMessage.content
            .filter((block) => block.type === "text")
            .map((block) => block.text)
            .join("");
          if (text) {
            db.prepare(
              "INSERT INTO coach_messages (role, content) VALUES ('assistant', ?)"
            ).run(text);
          }
        }
        controller.close();
      } catch (err) {
        const msg =
          err instanceof Anthropic.AuthenticationError
            ? "\n\n[The AI coach could not authenticate — check your ANTHROPIC_API_KEY.]"
            : err instanceof Anthropic.RateLimitError
              ? "\n\n[The AI coach is rate limited right now — try again in a moment.]"
              : "\n\n[The AI coach hit an unexpected error — please try again.]";
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
