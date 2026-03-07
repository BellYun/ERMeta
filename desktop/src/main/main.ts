import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import {
  ApiAuthMeResponse,
  AuthUpdateEvent,
  AuthUser,
  LogSnapshot,
  RecommendationRequest,
  TrioRecommendation,
} from "../shared/types";
import { clearSession, loadSession, saveSession } from "./authStore";
import { PlayerLogTailer } from "./logTailer";
import { captureNicknames, terminateOcrWorker } from "./ocrCapture";

type SessionRecord = AuthUser & { token: string };

const AUTH_UPDATE_CHANNEL = "auth:update";
const LOG_SNAPSHOT_CHANNEL = "log:snapshot";
const LOG_ERROR_CHANNEL = "log:error";
const OCR_SNAPSHOT_CHANNEL = "ocr:snapshot";

const OCR_POLL_INTERVAL_MS = 5000;

const RECOMMENDATION_CACHE_TTL_MS = 5 * 60 * 1000;

const recommendationCache = new Map<
  string,
  {
    expiresAt: number;
    data: TrioRecommendation[];
  }
>();

const deepLinkQueue: string[] = [];
let mainWindow: BrowserWindow | null = null;
let currentSession: SessionRecord | null = null;
let ocrPollTimer: NodeJS.Timeout | null = null;
let isMatchingReady = false;

const logPath = process.env.ERMETA_PLAYER_LOG_PATH;
const logTailer = logPath
  ? new PlayerLogTailer(logPath)
  : new PlayerLogTailer();

function getApiBaseUrl(): string {
  return process.env.ERMETA_API_BASE_URL ?? "http://localhost:3000";
}

function toApiUrl(pathname: string): URL {
  return new URL(pathname, getApiBaseUrl());
}

function cacheKey(input: RecommendationRequest): string {
  const character2 = input.character2 ?? "";
  const sortBy = input.sortBy ?? "totalGames";
  const limit = input.limit ?? 20;
  return `${input.character1}:${character2}:${sortBy}:${limit}`;
}

function broadcast(channel: string, payload: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function broadcastAuth(update: AuthUpdateEvent): void {
  broadcast(AUTH_UPDATE_CHANNEL, update);
}

function registerProtocol(): void {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("ermeta", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  } else {
    app.setAsDefaultProtocolClient("ermeta");
  }
}

function extractDeepLinkFromArgv(argv: string[]): string | null {
  return argv.find((value) => value.startsWith("ermeta://")) ?? null;
}

async function fetchAuthMe(token: string): Promise<AuthUser | null> {
  const url = toApiUrl("/api/auth/me");
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = (await response.json()) as ApiAuthMeResponse;
  if (!data.ok || !data.user || typeof data.expiresAt !== "number") {
    return null;
  }

  return {
    steamId: data.user.steamId,
    personaName: data.user.personaName,
    expiresAt: data.expiresAt,
  };
}

async function resolveSession(): Promise<SessionRecord | null> {
  if (!currentSession) {
    currentSession = await loadSession();
  }

  if (!currentSession) return null;

  if (currentSession.expiresAt <= Math.floor(Date.now() / 1000)) {
    await clearSession();
    currentSession = null;
    return null;
  }

  return currentSession;
}

async function resolveCurrentUser(): Promise<AuthUser | null> {
  const session = await resolveSession();
  if (!session) return null;

  const user = await fetchAuthMe(session.token).catch(() => null);
  if (!user) {
    await clearSession();
    currentSession = null;
    return null;
  }

  currentSession = {
    ...session,
    steamId: user.steamId,
    personaName: user.personaName,
    expiresAt: user.expiresAt,
  };

  await saveSession(currentSession);
  return user;
}

async function handleAuthCallback(deepLink: string): Promise<void> {
  let url: URL;

  try {
    url = new URL(deepLink);
  } catch {
    return;
  }

  if (!(url.hostname === "auth" && url.pathname === "/callback")) {
    return;
  }

  const error = url.searchParams.get("error");
  if (error) {
    const description =
      url.searchParams.get("error_description") ?? "Steam 로그인에 실패했습니다.";
    broadcastAuth({ status: "error", error: `${error}: ${description}` });
    return;
  }

  const token = url.searchParams.get("token");
  if (!token) {
    broadcastAuth({ status: "error", error: "토큰이 포함되지 않았습니다." });
    return;
  }

  const user = await fetchAuthMe(token).catch(() => null);
  if (!user) {
    broadcastAuth({
      status: "error",
      error: "로그인 검증에 실패했습니다. 서버 설정을 확인하세요.",
    });
    return;
  }

  currentSession = {
    token,
    steamId: user.steamId,
    personaName: user.personaName,
    expiresAt: user.expiresAt,
  };

  await saveSession(currentSession);

  broadcastAuth({
    status: "authenticated",
    user,
  });
}

async function processDeepLink(deepLink: string): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) {
    deepLinkQueue.push(deepLink);
    return;
  }

  await handleAuthCallback(deepLink);
}

function stopOcrPolling(): void {
  if (ocrPollTimer) {
    clearInterval(ocrPollTimer);
    ocrPollTimer = null;
  }
}

function startOcrPolling(): void {
  stopOcrPolling();
  const runOcr = () => {
    captureNicknames()
      .then((snap) => broadcast(OCR_SNAPSHOT_CHANNEL, snap))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "OCR 실패";
        broadcast(LOG_ERROR_CHANNEL, `[OCR] ${msg}`);
      });
  };
  runOcr();
  ocrPollTimer = setInterval(runOcr, OCR_POLL_INTERVAL_MS);
}

function attachTailerEvents(): void {
  logTailer.on("snapshot", (snapshot: LogSnapshot) => {
    recommendationCache.clear();
    broadcast(LOG_SNAPSHOT_CHANNEL, snapshot);

    if (snapshot.matchState === "found" && isMatchingReady) {
      startOcrPolling();
    } else if (
      snapshot.matchState === "in_match" ||
      snapshot.matchState === "idle"
    ) {
      stopOcrPolling();
      isMatchingReady = false;
    }
  });

  logTailer.on("error", (message) => {
    broadcast(LOG_ERROR_CHANNEL, message);
  });
}

function registerIpcHandlers(): void {
  ipcMain.handle("auth:login", async () => {
    const startUrl = toApiUrl("/api/auth/steam/start");
    startUrl.searchParams.set("redirect", "ermeta://auth/callback");

    await shell.openExternal(startUrl.toString());
    return { ok: true };
  });

  ipcMain.handle("auth:logout", async () => {
    await clearSession();
    currentSession = null;
    broadcastAuth({ status: "logged_out" });
    return { ok: true };
  });

  ipcMain.handle("auth:me", async () => {
    const user = await resolveCurrentUser();
    return user;
  });

  ipcMain.handle("log:start", async () => {
    await logTailer.start();
    return {
      ok: true,
      path: logTailer.getPath(),
      running: logTailer.isRunning(),
    };
  });

  ipcMain.handle("log:stop", async () => {
    logTailer.stop();
    return { ok: true };
  });

  ipcMain.handle("ocr:capture", async () => {
    return captureNicknames();
  });

  ipcMain.handle("matching:start", () => {
    isMatchingReady = true;
    return { ok: true };
  });

  ipcMain.handle("matching:stop", () => {
    isMatchingReady = false;
    stopOcrPolling();
    return { ok: true };
  });

  ipcMain.handle(
    "recommendation:get",
    async (_event, input: RecommendationRequest) => {
      if (!Number.isInteger(input.character1) || input.character1 <= 0) {
        throw new Error("character1은 양의 정수여야 합니다.");
      }

      if (
        input.character2 !== undefined &&
        (!Number.isInteger(input.character2) || input.character2 <= 0)
      ) {
        throw new Error("character2는 양의 정수여야 합니다.");
      }

      if (input.character2 !== undefined && input.character1 === input.character2) {
        throw new Error("character1과 character2는 달라야 합니다.");
      }

      const key = cacheKey(input);
      const now = Date.now();
      const cached = recommendationCache.get(key);
      if (cached && cached.expiresAt > now) {
        return cached.data;
      }

      const url = toApiUrl("/api/stats/trios");
      url.searchParams.set("character1", String(input.character1));
      if (input.character2 !== undefined) {
        url.searchParams.set("character2", String(input.character2));
      }
      url.searchParams.set("sortBy", input.sortBy ?? "totalGames");
      url.searchParams.set("limit", String(input.limit ?? 20));

      const response = await fetch(url.toString(), {
        cache: "no-store",
      });

      if (!response.ok) {
        const body = (await response.text()) || "추천 API 요청에 실패했습니다.";
        throw new Error(body);
      }

      const payload = (await response.json()) as {
        results?: TrioRecommendation[];
      };

      const results = payload.results ?? [];
      recommendationCache.set(key, {
        data: results,
        expiresAt: now + RECOMMENDATION_CACHE_TTL_MS,
      });

      return results;
    }
  );
}

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.ERMETA_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ERMETA_RENDERER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  for (const deepLink of deepLinkQueue.splice(0, deepLinkQueue.length)) {
    await handleAuthCallback(deepLink);
  }
}

async function initializeSessionState(): Promise<void> {
  const user = await resolveCurrentUser();
  if (!user) {
    broadcastAuth({ status: "logged_out" });
    return;
  }

  broadcastAuth({ status: "authenticated", user });
}

function setupAppEvents(): void {
  app.on("second-instance", (_event, argv) => {
    const deepLink = extractDeepLinkFromArgv(argv);
    if (deepLink) {
      void processDeepLink(deepLink);
    }

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on("open-url", (event, deepLink) => {
    event.preventDefault();
    void processDeepLink(deepLink);
  });

  app.on("window-all-closed", () => {
    void terminateOcrWorker();
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (!mainWindow) {
      void createMainWindow();
    }
  });
}

async function bootstrap(): Promise<void> {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }

  registerProtocol();
  setupAppEvents();
  attachTailerEvents();

  await app.whenReady();

  registerIpcHandlers();
  await createMainWindow();
  await initializeSessionState();

  const argvDeepLink = extractDeepLinkFromArgv(process.argv);
  if (argvDeepLink) {
    await processDeepLink(argvDeepLink);
  }
}

void bootstrap();
