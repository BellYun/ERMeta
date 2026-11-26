export const dynamic = "force-dynamic";

/**
 * AI 코치 스트리밍 프록시 라우트
 * - 브라우저 CORS 방지 및 백엔드(NestJS: 4000) SSE 스트림 연결 통로
 */
export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  if (!body?.message) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  const baseUrl = process.env.NEST_API_BASE_URL ?? "http://localhost:4000";

  try {
    const upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/api/ai-chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      signal: req.signal, // 클라이언트가 요청 취소(Abort) 시 백엔드로도 전파
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return Response.json(
      { error: "upstream_unavailable", details: String(error) },
      { status: 502 }
    );
  }
}
