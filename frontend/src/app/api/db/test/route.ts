import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase environment variables are missing.",
      },
      { status: 500 },
    );
  }

  try {
    const keyCandidates = [
      { name: "service_role", key: serviceRoleKey },
      { name: "anon", key: anonKey },
    ].filter((candidate): candidate is { name: string; key: string } => Boolean(candidate.key));

    const results: Array<{ keyType: string; status: number }> = [];
    let reachableBy: string | null = null;

    for (const candidate of keyCandidates) {
      const response = await fetch(new URL("/auth/v1/health", supabaseUrl), {
        method: "GET",
        headers: {
          apikey: candidate.key,
          Authorization: `Bearer ${candidate.key}`,
        },
        cache: "no-store",
      });

      results.push({ keyType: candidate.name, status: response.status });

      if (response.ok) {
        reachableBy = candidate.name;
        break;
      }
    }

    const isReachable = reachableBy !== null;

    return NextResponse.json({
      ok: isReachable,
      database: isReachable ? "supabase-reachable" : "supabase-unreachable",
      reachableBy,
      checks: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown DB error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
