import crypto from "crypto";

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const DEFAULT_STATE_TTL_SECONDS = 60 * 10; // 10 minutes

export interface DesktopSessionPayload {
  steamId: string;
  personaName: string;
  iat: number;
  exp: number;
  type: "desktop-session";
}

interface SteamStatePayload {
  redirectUri: string;
  nonce: string;
  iat: number;
  exp: number;
  type: "steam-state";
}

function getDesktopAuthSecret(): string {
  const secret =
    process.env.STEAM_AUTH_TOKEN_SECRET ?? process.env.CRON_SECRET;

  if (!secret) {
    throw new Error(
      "STEAM_AUTH_TOKEN_SECRET 또는 CRON_SECRET 환경 변수가 설정되어야 합니다."
    );
  }

  return secret;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payloadBase64: string): string {
  return crypto
    .createHmac("sha256", getDesktopAuthSecret())
    .update(payloadBase64)
    .digest("base64url");
}

function createSignedToken(payload: DesktopSessionPayload | SteamStatePayload): string {
  const payloadBase64 = toBase64Url(JSON.stringify(payload));
  const signature = sign(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

function verifySignedToken<T extends { exp: number }>(token: string): T | null {
  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) return null;

  const expected = sign(payloadBase64);
  if (signature.length !== expected.length) return null;

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(payloadBase64)) as T;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function issueDesktopSessionToken(
  input: Pick<DesktopSessionPayload, "steamId" | "personaName">
): { token: string; payload: DesktopSessionPayload } {
  const now = Math.floor(Date.now() / 1000);
  const ttl =
    Number(process.env.STEAM_APP_TOKEN_TTL_SEC) || DEFAULT_SESSION_TTL_SECONDS;

  const payload: DesktopSessionPayload = {
    steamId: input.steamId,
    personaName: input.personaName,
    iat: now,
    exp: now + ttl,
    type: "desktop-session",
  };

  return {
    token: createSignedToken(payload),
    payload,
  };
}

export function verifyDesktopSessionToken(
  token: string
): DesktopSessionPayload | null {
  const payload = verifySignedToken<DesktopSessionPayload>(token);
  if (!payload || payload.type !== "desktop-session") return null;
  return payload;
}

export function issueSteamStateToken(input: {
  redirectUri: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SteamStatePayload = {
    redirectUri: input.redirectUri,
    nonce: crypto.randomBytes(12).toString("hex"),
    iat: now,
    exp: now + DEFAULT_STATE_TTL_SECONDS,
    type: "steam-state",
  };

  return createSignedToken(payload);
}

export function verifySteamStateToken(token: string): SteamStatePayload | null {
  const payload = verifySignedToken<SteamStatePayload>(token);
  if (!payload || payload.type !== "steam-state") return null;
  return payload;
}
