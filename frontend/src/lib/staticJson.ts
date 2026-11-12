export async function fetchStaticJson<T>(path: string, signal?: AbortSignal): Promise<T | null> {
  const response = await fetch(path, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("statistics_snapshot_unavailable");

  if (!path.endsWith(".gz")) return response.json();
  if (!response.body) throw new Error("statistics_snapshot_empty");
  return new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).json();
}
