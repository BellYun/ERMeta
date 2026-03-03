import { app, safeStorage } from "electron";
import fs from "fs/promises";
import path from "path";
import { AuthUser } from "../shared/types";

const SERVICE_NAME = "ermeta-desktop";
const ACCOUNT_NAME = "steam-session";
const FALLBACK_FILENAME = "session.enc";

type SessionRecord = AuthUser & {
  token: string;
};

type KeytarLike = {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
};

let keytarModulePromise: Promise<KeytarLike | null> | null = null;

async function loadKeytar(): Promise<KeytarLike | null> {
  if (!keytarModulePromise) {
    keytarModulePromise = import("keytar")
      .then((mod) => mod.default as KeytarLike)
      .catch(() => null);
  }

  return keytarModulePromise;
}

function getFallbackFilePath(): string {
  return path.join(app.getPath("userData"), FALLBACK_FILENAME);
}

function encodeForFallback(raw: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(raw).toString("base64");
  }

  return Buffer.from(raw, "utf8").toString("base64");
}

function decodeFromFallback(encoded: string): string {
  const buffer = Buffer.from(encoded, "base64");
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(buffer);
  }

  return buffer.toString("utf8");
}

async function saveToFallbackStorage(raw: string): Promise<void> {
  const filePath = getFallbackFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, encodeForFallback(raw), "utf8");
}

async function loadFromFallbackStorage(): Promise<string | null> {
  const filePath = getFallbackFilePath();

  try {
    const encoded = await fs.readFile(filePath, "utf8");
    if (!encoded.trim()) return null;
    return decodeFromFallback(encoded);
  } catch {
    return null;
  }
}

async function clearFallbackStorage(): Promise<void> {
  try {
    await fs.unlink(getFallbackFilePath());
  } catch {
    // Ignore missing file.
  }
}

function parseSession(raw: string | null): SessionRecord | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SessionRecord>;
    if (
      !parsed ||
      typeof parsed.token !== "string" ||
      typeof parsed.steamId !== "string" ||
      typeof parsed.personaName !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    return {
      token: parsed.token,
      steamId: parsed.steamId,
      personaName: parsed.personaName,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function saveSession(session: SessionRecord): Promise<void> {
  const serialized = JSON.stringify(session);
  const keytar = await loadKeytar();

  if (keytar) {
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, serialized);
    return;
  }

  await saveToFallbackStorage(serialized);
}

export async function loadSession(): Promise<SessionRecord | null> {
  const keytar = await loadKeytar();
  if (keytar) {
    const raw = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    return parseSession(raw);
  }

  const raw = await loadFromFallbackStorage();
  return parseSession(raw);
}

export async function clearSession(): Promise<void> {
  const keytar = await loadKeytar();
  if (keytar) {
    await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    return;
  }

  await clearFallbackStorage();
}
