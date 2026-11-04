import { getRandomExperimentBucket, type StorageLike } from "./adBlockRecoveryExperiment";

const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_HALF_MS = 15 * DAY_MS;
const ENROLLMENT_MS = 30 * DAY_MS;
const REVENUE_WINDOW_MS = 7 * DAY_MS;

type PilotVariant = "context" | "holdout";
type PilotHalf = "first" | "second";

export interface AdBlockRecoveryPilotAssignment {
  id: string;
  variant: PilotVariant;
  half: PilotHalf;
  assignedAt: number;
  pilotStart: number;
}

interface PilotConfig {
  start: number;
  channels: Record<PilotHalf, Record<PilotVariant, string>>;
}

export function resolveAdBlockRecoveryPilotConfig(startAt?: string, channelList?: string) {
  if (!startAt || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(startAt)) return;
  const start = Date.parse(startAt);
  const channels = channelList?.split(",").map((channel) => channel.trim());
  if (
    !Number.isFinite(start) ||
    channels?.length !== 4 ||
    new Set(channels).size !== 4 ||
    channels.some((channel) => !/^\d+$/.test(channel))
  ) {
    return;
  }
  const [firstContext, firstHoldout, secondContext, secondHoldout] = channels;
  return {
    start,
    channels: {
      first: { context: firstContext, holdout: firstHoldout },
      second: { context: secondContext, holdout: secondHoldout },
    },
  } satisfies PilotConfig;
}

export const AD_BLOCK_RECOVERY_PILOT_CONFIG =
  process.env.NEXT_PUBLIC_AD_BLOCK_RECOVERY_MODE === "pilot" &&
  process.env.NEXT_PUBLIC_ADSENSE_DISABLED !== "true" &&
  process.env.NEXT_PUBLIC_ADSENSE_PREVIEW !== "true"
    ? resolveAdBlockRecoveryPilotConfig(
        process.env.NEXT_PUBLIC_AD_BLOCK_RECOVERY_PILOT_START_AT,
        process.env.NEXT_PUBLIC_AD_BLOCK_RECOVERY_PILOT_CHANNELS
      )
    : undefined;

function assignmentKey(config: PilotConfig) {
  return "ergg:adblock-recovery:v2:" + config.start;
}

function getHalf(config: PilotConfig, assignedAt: number): PilotHalf {
  return assignedAt - config.start < FIRST_HALF_MS ? "first" : "second";
}

function isEnrolling(config: PilotConfig, now: number) {
  return now >= config.start && now < config.start + ENROLLMENT_MS;
}

function readAssignment(storage: StorageLike, config: PilotConfig) {
  const raw = storage.getItem(assignmentKey(config));
  if (!raw) return;
  const saved = JSON.parse(raw) as Partial<AdBlockRecoveryPilotAssignment> | null;
  if (
    !saved ||
    typeof saved.id !== "string" ||
    !saved.id ||
    (saved.variant !== "context" && saved.variant !== "holdout") ||
    typeof saved.assignedAt !== "number" ||
    !isEnrolling(config, saved.assignedAt) ||
    saved.pilotStart !== config.start ||
    saved.half !== getHalf(config, saved.assignedAt)
  ) {
    return;
  }
  return {
    id: saved.id,
    variant: saved.variant,
    half: saved.half,
    assignedAt: saved.assignedAt,
    pilotStart: saved.pilotStart,
  } satisfies AdBlockRecoveryPilotAssignment;
}

function isWithinWindow(assignment: AdBlockRecoveryPilotAssignment, now: number, duration: number) {
  const age = now - assignment.assignedAt;
  return age >= 0 && age < duration;
}

async function withPilotStorage<T>(
  config: PilotConfig,
  action: (storage: Storage) => T
): Promise<T | undefined> {
  try {
    // A shared origin lock prevents two tabs from allocating the same browser independently.
    return await navigator.locks?.request(assignmentKey(config), () => action(window.localStorage));
  } catch {
    return undefined;
  }
}

export function assignAdBlockRecoveryPilot(config: PilotConfig, stillEligible: () => boolean) {
  return withPilotStorage(config, (storage) => {
    if (!stillEligible()) return;
    const now = Date.now();
    const existing = readAssignment(storage, config);
    if (existing) {
      if (isWithinWindow(existing, now, REVENUE_WINDOW_MS)) {
        return { assignment: existing, isNew: false };
      }
      return;
    }
    if (!isEnrolling(config, now)) return;

    const assignment: AdBlockRecoveryPilotAssignment = {
      id: crypto.randomUUID(),
      variant: getRandomExperimentBucket() < 0.5 ? "context" : "holdout",
      half: getHalf(config, now),
      assignedAt: now,
      pilotStart: config.start,
    };
    storage.setItem(assignmentKey(config), JSON.stringify(assignment));
    return { assignment, isNew: true };
  });
}

export function getAdBlockRecoveryPilotChannel(
  config = AD_BLOCK_RECOVERY_PILOT_CONFIG,
  now = Date.now()
) {
  if (!config || typeof window === "undefined") return;
  try {
    const assignment = readAssignment(window.localStorage, config);
    if (assignment && isWithinWindow(assignment, now, REVENUE_WINDOW_MS)) {
      return config.channels[assignment.half][assignment.variant];
    }
  } catch {
    return undefined;
  }
}

export async function claimAdBlockRecoveryPilotCoreUse(config: PilotConfig, observedAt: number) {
  if (typeof window === "undefined") return;
  try {
    const key = assignmentKey(config) + ":core-used";
    const storage = window.localStorage;
    const current = readAssignment(storage, config);
    if (
      !current ||
      !isWithinWindow(current, observedAt, DAY_MS) ||
      storage.getItem(key) === current.id
    ) {
      return;
    }

    return await withPilotStorage(config, (lockedStorage) => {
      const assignment = readAssignment(lockedStorage, config);
      if (assignment?.id !== current.id || lockedStorage.getItem(key) === assignment.id) return;
      lockedStorage.setItem(key, assignment.id);
      return assignment;
    });
  } catch {
    return undefined;
  }
}
