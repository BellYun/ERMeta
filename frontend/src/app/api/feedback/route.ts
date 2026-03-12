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
  return new Date().toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).replace(" ", "T") + "+09:00";
}

export async function POST(request: Request): Promise<Response> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  let body: { category?: string; message?: string; contact?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "메시지를 입력해주세요." }, { status: 400 });
  }

  const { category, message, contact } = body;

  if (!message || message.trim() === "") {
    return Response.json({ error: "메시지를 입력해주세요." }, { status: 400 });
  }

  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("[feedback] GOOGLE_SHEETS_WEBHOOK_URL is not set. Skipping webhook.");
  } else {
    const payload = {
      category: category ?? "",
      message: message.trim(),
      contact: contact ?? "",
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
      }
    } catch (err) {
      console.error("[feedback] Failed to send to webhook:", err);
    }
  }

  return Response.json({ success: true }, { status: 201 });
}
