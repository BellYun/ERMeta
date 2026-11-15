export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("Invalid body");
    }
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { message, sessionId, nickname } = body;
  if (typeof message !== "string" || !message.trim() || message.trim().length > 500) {
    return Response.json({ error: "invalid_message" }, { status: 400 });
  }

  try {
    const baseUrl = process.env.NEST_API_BASE_URL ?? "http://localhost:4000";
    const upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/api/ai-chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ message, sessionId, nickname }),
      signal: req.signal,
      cache: "no-store",
    });

    const contentType = upstream.headers.get("Content-Type") ?? "";
    if (upstream.ok && (!upstream.body || !contentType.startsWith("text/event-stream"))) {
      await upstream.body?.cancel();
      return Response.json({ error: "invalid_stream" }, { status: 502 });
    }

    const headers = new Headers({
      "Content-Type": contentType || "application/json",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    });
    const retryAfter = upstream.headers.get("Retry-After");
    if (retryAfter) headers.set("Retry-After", retryAfter);

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return Response.json(
      { error: "ai_coach_unavailable" },
      { status: req.signal.aborted ? 499 : 502 }
    );
  }
}
