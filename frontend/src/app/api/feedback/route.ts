import { sanitizeFeedbackContext } from "@/lib/feedbackContext";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 5) {
    return false;
  }

  entry.count += 1;
  return true;
}

function getKSTTimestamp(): string {
  return (
    new Date().toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).replace(" ", "T") + "+09:00"
  );
}

export async function POST(request: Request): Promise<Response> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  if (!checkRateLimit(ip)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "message_required" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "message_required" }, { status: 400 });
  }

  const { category, message, contact, context } = body as Record<string, unknown>;

  if (typeof message !== "string" || message.trim() === "") {
    return Response.json({ error: "message_required" }, { status: 400 });
  }

  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  if (!webhookUrl) {
    return Response.json({ error: "feedback_unavailable" }, { status: 503 });
  } else {
    const payload = {
      category: typeof category === "string" ? category : "",
      message: message.trim(),
      contact: typeof contact === "string" ? contact : "",
      context: sanitizeFeedbackContext(context),
      timestamp: getKSTTimestamp(),
      userAgent: request.headers.get("user-agent") ?? "",
    };

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error(`[feedback] Webhook responded with status ${res.status}`);
        return Response.json({ error: "feedback_delivery_failed" }, { status: 502 });
      }
    } catch (err) {
      console.error("[feedback] Failed to send to webhook:", err);
      return Response.json({ error: "feedback_delivery_failed" }, { status: 502 });
    }
  }

  return Response.json({ success: true }, { status: 201 });
}
