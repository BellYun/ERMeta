/**
 * BSER Open API 클라이언트 (Deno)
 * Rate limit: 1 request/sec, 86,400 calls/day
 */

const BASE_URL = "https://open-api.bser.io/v1";

function getApiKey(): string {
  const key = Deno.env.get("BSER_API_KEY");
  if (!key) throw new Error("BSER_API_KEY 환경변수가 설정되지 않았습니다.");
  return key;
}

function headers(): HeadersInit {
  return { accept: "application/json", "x-api-key": getApiKey() };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 단일 게임 상세 조회
 * @returns game data or null (404)
 */
export async function fetchGame(gameId: number): Promise<any | null> {
  const res = await fetch(`${BASE_URL}/games/${gameId}`, { headers: headers() });

  if (res.status === 404) return null;
  if (res.status === 429) {
    console.warn(`[BSER] 429 rate limit, 2초 대기 후 재시도...`);
    await sleep(2000);
    const retry = await fetch(`${BASE_URL}/games/${gameId}`, { headers: headers() });
    if (retry.status === 404) return null;
    if (!retry.ok) throw new Error(`BSER API ${retry.status}: game ${gameId}`);
    const data = await retry.json();
    return data?.code === 404 ? null : data;
  }
  if (!res.ok) throw new Error(`BSER API ${res.status}: game ${gameId}`);

  const data = await res.json();
  return data?.code === 404 ? null : data;
}

/**
 * 게임 번호 범위로 순차 수집 (정방향)
 */
export async function fetchGamesForward(
  fromGameNumber: number,
  limit: number,
  budgetMs: number
): Promise<{ games: any[]; lastGameNumber: number }> {
  const games: any[] = [];
  const start = Date.now();
  let current = fromGameNumber;

  for (let i = 0; i < limit; i++) {
    if (Date.now() - start >= budgetMs) break;

    try {
      const game = await fetchGame(current);
      if (game !== null) {
        games.push(game);
      }
    } catch (e) {
      console.error(`[BSER] fetchForward error game ${current}:`, e);
    }

    current++;
    await sleep(1000); // rate limit 1req/s
  }

  return { games, lastGameNumber: current - 1 };
}

/**
 * 게임 번호 범위로 역순 수집 (백필)
 */
export async function fetchGamesBackward(
  beforeGameNumber: number,
  limit: number,
  budgetMs: number
): Promise<{ games: any[]; lastGameNumber: number }> {
  const games: any[] = [];
  const start = Date.now();
  let current = beforeGameNumber - 1;

  for (let i = 0; i < limit; i++) {
    if (current < 1 || Date.now() - start >= budgetMs) break;

    try {
      const game = await fetchGame(current);
      if (game !== null) {
        games.push(game);
      }
    } catch (e) {
      console.error(`[BSER] fetchBackward error game ${current}:`, e);
    }

    current--;
    await sleep(1000); // rate limit 1req/s
  }

  return { games, lastGameNumber: current + 1 };
}

/**
 * 랭킹 Top 1000 조회
 */
export async function fetchTopRanks(
  seasonId: number,
  teamMode: number
): Promise<any[]> {
  const res = await fetch(
    `${BASE_URL}/rank/top/${seasonId}/${teamMode}`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`BSER rank API ${res.status}`);
  const data = await res.json();
  return data?.topRanks ?? data?.data?.topRanks ?? [];
}
