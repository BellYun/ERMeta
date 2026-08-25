export const AD_BLOCK_RECOVERY_EXPERIMENT = "adblock_recovery_prompt_v1";

export type AdBlockRecoveryVariant = "context" | "direct";
export type AdBlockRecoveryMode = "off" | "experiment" | AdBlockRecoveryVariant;
export type AdBlockRecoveryDismissReason = "close" | "later" | "backdrop" | "escape";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface RecoveryAttempt {
  variant: AdBlockRecoveryVariant;
  attemptedAt: number;
  pagePath: string;
}

const STORAGE_KEYS = {
  variant: "ergg:adblock-recovery:v1:variant",
  dismissedUntil: "ergg:adblock-recovery:v1:dismissed-until",
  recoveryAttempt: "ergg:adblock-recovery:v1:attempt",
} as const;

export const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const RECOVERY_ATTEMPT_TTL_MS = 30 * 60 * 1000;

function isVariant(value: unknown): value is AdBlockRecoveryVariant {
  return value === "context" || value === "direct";
}

export function getOrCreateAdBlockRecoveryVariant(
  storage: StorageLike,
  randomBucket: number
): AdBlockRecoveryVariant {
  try {
    const stored = storage.getItem(STORAGE_KEYS.variant);
    if (isVariant(stored)) return stored;
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }

  const variant: AdBlockRecoveryVariant = randomBucket < 0.5 ? "context" : "direct";

  try {
    storage.setItem(STORAGE_KEYS.variant, variant);
  } catch {
    // The in-memory assignment still keeps this render internally consistent.
  }

  return variant;
}

export function resolveAdBlockRecoveryVariant(
  storage: StorageLike,
  mode: AdBlockRecoveryMode,
  randomBucket: number
): AdBlockRecoveryVariant | null {
  if (mode === "off") return null;
  if (mode === "context" || mode === "direct") return mode;
  return getOrCreateAdBlockRecoveryVariant(storage, randomBucket);
}

export function isAdBlockRecoveryPromptSuppressed(storage: StorageLike, now: number): boolean {
  try {
    const dismissedUntil = Number(storage.getItem(STORAGE_KEYS.dismissedUntil));
    return Number.isFinite(dismissedUntil) && dismissedUntil > now;
  } catch {
    return false;
  }
}

export function suppressAdBlockRecoveryPrompt(storage: StorageLike, now: number): void {
  try {
    storage.setItem(STORAGE_KEYS.dismissedUntil, String(now + DISMISS_COOLDOWN_MS));
  } catch {
    // The prompt remains dismissible for the current render even without storage.
  }
}

export function markAdBlockRecoveryAttempt(storage: StorageLike, attempt: RecoveryAttempt): void {
  try {
    storage.setItem(STORAGE_KEYS.recoveryAttempt, JSON.stringify(attempt));
  } catch {
    // Analytics conversion will be unavailable, but reload must still proceed.
  }
}

export function consumeRecentAdBlockRecoveryAttempt(
  storage: StorageLike,
  now: number
): RecoveryAttempt | null {
  let raw: string | null = null;

  try {
    raw = storage.getItem(STORAGE_KEYS.recoveryAttempt);
    storage.removeItem(STORAGE_KEYS.recoveryAttempt);
  } catch {
    return null;
  }

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<RecoveryAttempt>;
    if (!isVariant(parsed.variant)) return null;
    if (typeof parsed.attemptedAt !== "number" || !Number.isFinite(parsed.attemptedAt)) {
      return null;
    }
    if (typeof parsed.pagePath !== "string") return null;
    if (now - parsed.attemptedAt < 0 || now - parsed.attemptedAt > RECOVERY_ATTEMPT_TTL_MS) {
      return null;
    }

    return {
      variant: parsed.variant,
      attemptedAt: parsed.attemptedAt,
      pagePath: parsed.pagePath,
    };
  } catch {
    return null;
  }
}

export function getRandomExperimentBucket(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] / 2 ** 32;
  }

  return Math.random();
}
