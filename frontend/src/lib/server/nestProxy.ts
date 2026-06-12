import { NextResponse } from "next/server";

const ENABLED_VALUE = "true";

function isNestProxyEnabled(): boolean {
  return process.env.USE_NEST_API === ENABLED_VALUE;
}

function buildNestUrl(path: string, requestUrl: string): URL | null {
  const baseUrl = process.env.NEST_API_BASE_URL;
  if (!baseUrl) return null;

  const target = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const source = new URL(requestUrl);

  source.searchParams.forEach((value, key) => {
    if (!target.searchParams.has(key)) target.searchParams.append(key, value);
  });

  return target;
}

function getProxyHeaders(request: Request): Headers {
  const headers = new Headers();
  const accept = request.headers.get("accept");
  const userAgent = request.headers.get("user-agent");
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (accept) headers.set("accept", accept);
  if (userAgent) headers.set("user-agent", userAgent);
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

  return headers;
}

export async function tryNestApiProxy(
  request: Request,
  path: string
): Promise<NextResponse | null> {
  if (!isNestProxyEnabled()) return null;

  const target = buildNestUrl(path, request.url);
  if (!target) {
    console.warn("[nestProxy] NEST_API_BASE_URL is not configured");
    return null;
  }

  try {
    const response = await fetch(target, {
      method: request.method,
      headers: getProxyHeaders(request),
      cache: "no-store",
    });
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[nestProxy] fallback to local route:", message);
    return null;
  }
}
