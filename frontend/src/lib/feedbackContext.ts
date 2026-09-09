const CONTEXT_SCHEMA_VERSION = 1 as const;
const CONTEXT_WINDOW_MS = 60_000;
const MAX_BREADCRUMBS = 30;
const MAX_METADATA_ENTRIES = 6;
const MAX_STRING_LENGTH = 160;

const BREADCRUMB_TYPES = [
  "navigation",
  "interaction",
  "network",
  "error",
  "state",
  "feedback",
] as const;

const SAFE_QUERY_KEYS = new Set([
  "ally1",
  "ally2",
  "character",
  "characterCode",
  "limit",
  "locale",
  "mode",
  "page",
  "patch",
  "patchVersion",
  "scope",
  "sort",
  "tab",
  "tier",
  "weapon",
  "weaponCode",
]);

const SAFE_PATH_SEGMENTS = new Set([
  "about",
  "api",
  "character",
  "character-analysis",
  "character-lab",
  "composition-lab",
  "design-lab",
  "en",
  "feedback",
  "history",
  "insights",
  "ja",
  "ko",
  "lab",
  "methodology",
  "multi-search",
  "new",
  "palette-lab",
  "patch-analysis",
  "patches",
  "preview",
  "privacy",
  "players",
  "search",
  "season10-recap",
  "season11-recap",
  "share",
  "share-invalid",
  "synergy",
  "synergy-detail",
  "synergy-matrix",
  "synergy-pairs",
  "stats",
  "stats-history",
  "team-combos",
  "terms",
  "updates",
  "zh-Hans",
  "zh-Hant",
]);

type BreadcrumbType = (typeof BREADCRUMB_TYPES)[number];
type ContextScalar = string | number | boolean | null;
type BreadcrumbMetadata = Record<string, ContextScalar>;

interface StoredBreadcrumb {
  timestamp: number;
  type: BreadcrumbType;
  name: string;
  metadata?: BreadcrumbMetadata;
}

export interface FeedbackBreadcrumb {
  ageMs: number;
  type: BreadcrumbType;
  name: string;
  metadata?: BreadcrumbMetadata;
}

export interface FeedbackContextCapsule {
  schemaVersion: typeof CONTEXT_SCHEMA_VERSION;
  capsuleId: string;
  capturedAt: string;
  page: {
    path: string;
    query: Record<string, string>;
  };
  client: {
    locale: string;
    viewportWidth: number;
    viewportHeight: number;
    devicePixelRatio: number;
    online: boolean;
    visibility: string;
  };
  release: string;
  sessionAgeMs: number;
  navigation?: {
    type: string;
    ttfbMs: number;
    domInteractiveMs: number;
    domContentLoadedMs: number;
    loadMs: number;
  };
  webVitals: Record<string, { value: number; rating: string }>;
  state: Record<string, Record<string, ContextScalar>>;
  breadcrumbs: FeedbackBreadcrumb[];
}

export interface FeedbackBreadcrumbInput {
  type: BreadcrumbType;
  name: string;
  metadata?: Record<string, unknown>;
}

export interface FeedbackContextScopeValues {
  global_filter: {
    patch: string;
    tier: string;
  };
  character_analysis: {
    characterCode: number;
    tier: string;
    patch: string | null;
    weaponCode: number | null;
  };
  synergy_selection: {
    ally1Code: number | null;
    ally2Code: number | null;
    searchMode: "empty" | "chosung" | "text";
    searchLength: number;
    hasWhitespace: boolean;
    resultCount: number;
  };
  synergy_results: {
    ally1Code: number | null;
    ally2Code: number | null;
    sortBy: string;
    focusCount: number;
    status: "idle" | "loading" | "error" | "empty" | "ready";
    resultCount: number;
  };
  synergy_detail_selection: {
    ally1Code: number | null;
    ally1WeaponCode: number | null;
    ally2Code: number | null;
    ally2WeaponCode: number | null;
    selectedCount: number;
    availableItemCount: number;
  };
  synergy_detail_search: {
    searchMode: "empty" | "chosung" | "text";
    searchLength: number;
    hasWhitespace: boolean;
    resultCount: number;
    firstCharacterCode: number | null;
    firstWeaponCode: number | null;
  };
  synergy_detail_results: {
    ally1Code: number | null;
    ally2Code: number | null;
    sortBy: string;
    minimumGames: number;
    status: "idle" | "loading" | "error" | "empty" | "ready";
    resultCount: number;
  };
  tier_ranking_filter: {
    patch: string;
    matchmakingTier: string;
    role: string;
    sortKey: string;
    sortDir: string;
    visibleCount: number;
  };
  tier_ranking_results: {
    rowCount: number;
    sCount: number;
    aCount: number;
    bCount: number;
    cCount: number;
    dCount: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, value));
}

function sanitizeKey(value: unknown, maxLength = 48): string | null {
  if (typeof value !== "string") return null;
  const sanitized = value.replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, maxLength);
  return sanitized || null;
}

function redactSensitiveText(value: unknown, maxLength = MAX_STRING_LENGTH): string | null {
  if (typeof value !== "string") return null;

  const sanitized = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b(?:bearer\s+)?[a-z0-9_-]{24,}\b/gi, "[token]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return sanitized || null;
}

function sanitizeScalar(value: unknown): ContextScalar | undefined {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  return redactSensitiveText(value, 80) ?? undefined;
}

function sanitizeMetadata(value: unknown): BreadcrumbMetadata | undefined {
  if (!isRecord(value)) return undefined;

  const entries: Array<[string, ContextScalar]> = [];
  for (const [rawKey, rawValue] of Object.entries(value).slice(0, MAX_METADATA_ENTRIES)) {
    const key = sanitizeKey(rawKey);
    const scalar = sanitizeScalar(rawValue);
    if (key && scalar !== undefined) entries.push([key, scalar]);
  }

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function sanitizePathname(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segments = normalized.split("/").map((segment) => {
    if (!segment) return "";
    const decoded = (() => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })();

    if (
      SAFE_PATH_SEGMENTS.has(decoded) ||
      /^\d{1,8}$/.test(decoded) ||
      /^\d+(?:\.\d+){1,2}$/.test(decoded)
    ) {
      return decoded;
    }
    return "[redacted]";
  });

  return segments.join("/").slice(0, 240) || "/";
}

export function sanitizeFeedbackUrl(
  rawUrl: string,
  baseUrl = "https://feedback-context.invalid"
): { path: string; query: Record<string, string> } {
  try {
    const url = new URL(rawUrl, baseUrl);
    const query: Record<string, string> = {};

    for (const [key, value] of url.searchParams) {
      if (!SAFE_QUERY_KEYS.has(key) || query[key] !== undefined) continue;
      if (!/^[a-z0-9_.,:+-]{1,48}$/i.test(value)) continue;
      query[key] = value;
    }

    return { path: sanitizePathname(url.pathname), query };
  } catch {
    return { path: "/", query: {} };
  }
}

export class FeedbackBreadcrumbBuffer {
  private entries: StoredBreadcrumb[] = [];

  constructor(
    private readonly maxEntries = MAX_BREADCRUMBS,
    private readonly windowMs = CONTEXT_WINDOW_MS
  ) {}

  add(input: FeedbackBreadcrumbInput, timestamp = Date.now()) {
    const name = sanitizeKey(input.name, 80);
    if (!name || !BREADCRUMB_TYPES.includes(input.type)) return;

    this.entries.push({
      timestamp,
      type: input.type,
      name,
      metadata: sanitizeMetadata(input.metadata),
    });
    this.prune(timestamp);
  }

  snapshot(timestamp = Date.now()): FeedbackBreadcrumb[] {
    this.prune(timestamp);
    return this.entries.map(({ timestamp: occurredAt, type, name, metadata }) => ({
      ageMs: Math.max(0, timestamp - occurredAt),
      type,
      name,
      ...(metadata ? { metadata } : {}),
    }));
  }

  clear() {
    this.entries = [];
  }

  private prune(timestamp: number) {
    const cutoff = timestamp - this.windowMs;
    this.entries = this.entries.filter((entry) => entry.timestamp >= cutoff);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }
}

const breadcrumbBuffer = new FeedbackBreadcrumbBuffer();
const scopedState = new Map<string, Record<string, ContextScalar>>();
const webVitals = new Map<string, { value: number; rating: string }>();
const sessionStartedAt = Date.now();
let captureSubscribers = 0;
let stopCapture: (() => void) | null = null;

function createCapsuleId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `capsule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function roundMetric(value: number): number {
  return Math.round(value * 10) / 10;
}

function getNavigationSnapshot(): FeedbackContextCapsule["navigation"] {
  if (typeof performance === "undefined") return undefined;
  const entry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (!entry) return undefined;

  return {
    type: entry.type,
    ttfbMs: roundMetric(entry.responseStart),
    domInteractiveMs: roundMetric(entry.domInteractive),
    domContentLoadedMs: roundMetric(entry.domContentLoadedEventEnd),
    loadMs: roundMetric(entry.loadEventEnd),
  };
}

function describeInteraction(target: EventTarget | null): BreadcrumbMetadata | undefined {
  if (!(target instanceof Element)) return undefined;
  const interactive = target.closest<HTMLElement>(
    "[data-voc-action],a,button,select,input,[role='button'],[role='radio'],[role='tab']"
  );
  if (!interactive) return undefined;

  const metadata: BreadcrumbMetadata = {
    element: interactive.tagName.toLowerCase(),
  };
  const action = sanitizeKey(interactive.dataset.vocAction, 64);
  const code = sanitizeKey(interactive.dataset.vocCode, 16);
  const weaponCode = sanitizeKey(interactive.dataset.vocWeaponCode, 16);
  const role = sanitizeKey(interactive.getAttribute("role"), 32);
  if (action) metadata.action = action;
  if (code) metadata.code = code;
  if (weaponCode) metadata.weaponCode = weaponCode;
  if (role) metadata.role = role;

  if (interactive instanceof HTMLAnchorElement) {
    metadata.destination = sanitizeFeedbackUrl(interactive.href, window.location.href).path;
  }

  return metadata;
}

function describeError(error: unknown): BreadcrumbMetadata | undefined {
  if (error instanceof Error) {
    return {
      errorName: sanitizeKey(error.name, 48) ?? "Error",
      ...(redactSensitiveText(error.message)
        ? { message: redactSensitiveText(error.message) }
        : {}),
    };
  }

  const message = redactSensitiveText(error);
  return message ? { message } : undefined;
}

export function recordFeedbackBreadcrumb(input: FeedbackBreadcrumbInput) {
  breadcrumbBuffer.add(input);
}

export function recordFeedbackWebVital(name: string, value: number, rating: string) {
  const safeName = sanitizeKey(name, 16);
  const safeRating = sanitizeKey(rating, 16);
  if (!safeName || !safeRating || !Number.isFinite(value)) return;
  webVitals.set(safeName, { value: roundMetric(value), rating: safeRating });
}

export function setFeedbackContextState<Scope extends keyof FeedbackContextScopeValues>(
  scope: Scope,
  values: FeedbackContextScopeValues[Scope]
): () => void {
  const safeScope = sanitizeKey(scope, 48);
  if (!safeScope) return () => {};

  const safeValues = sanitizeMetadata(values);
  if (!safeValues) return () => {};
  scopedState.set(safeScope, safeValues);

  return () => {
    if (scopedState.get(safeScope) === safeValues) scopedState.delete(safeScope);
  };
}

export function startFeedbackContextCapture(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  captureSubscribers += 1;
  if (stopCapture) return releaseCaptureSubscriber;

  recordFeedbackBreadcrumb({
    type: "navigation",
    name: "page_loaded",
    metadata: { path: sanitizeFeedbackUrl(window.location.href).path },
  });

  const handleClick = (event: Event) => {
    const metadata = describeInteraction(event.target);
    if (metadata) recordFeedbackBreadcrumb({ type: "interaction", name: "click", metadata });
  };

  const handlePointerDown = (event: PointerEvent) => {
    const metadata = describeInteraction(event.target);
    if (!metadata?.action) return;
    recordFeedbackBreadcrumb({
      type: "interaction",
      name: "pointer_down",
      metadata: {
        ...metadata,
        pointerType: sanitizeKey(event.pointerType, 16) ?? "unknown",
      },
    });
  };

  const handleChange = (event: Event) => {
    const metadata = describeInteraction(event.target);
    if (metadata) recordFeedbackBreadcrumb({ type: "interaction", name: "change", metadata });
  };

  const handleError = (event: ErrorEvent) => {
    recordFeedbackBreadcrumb({
      type: "error",
      name: "window_error",
      metadata: {
        ...describeError(event.error ?? event.message),
        ...(event.filename
          ? { source: sanitizeFeedbackUrl(event.filename, window.location.href).path }
          : {}),
      },
    });
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    recordFeedbackBreadcrumb({
      type: "error",
      name: "unhandled_rejection",
      metadata: describeError(event.reason),
    });
  };

  document.addEventListener("pointerdown", handlePointerDown, { capture: true, passive: true });
  document.addEventListener("click", handleClick, true);
  document.addEventListener("change", handleChange, true);
  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  let resourceObserver: PerformanceObserver | null = null;
  if (typeof PerformanceObserver !== "undefined") {
    try {
      resourceObserver = new PerformanceObserver((list) => {
        for (const item of list.getEntries()) {
          const entry = item as PerformanceResourceTiming;
          if (!["fetch", "xmlhttprequest"].includes(entry.initiatorType)) continue;
          const responseStatus = "responseStatus" in entry ? entry.responseStatus : 0;
          if (responseStatus < 400 && entry.duration < 2_500) continue;

          const endpoint = sanitizeFeedbackUrl(entry.name, window.location.href);
          recordFeedbackBreadcrumb({
            type: "network",
            name: responseStatus >= 400 ? "request_failed" : "request_slow",
            metadata: {
              path: endpoint.path,
              status: responseStatus || null,
              durationMs: roundMetric(entry.duration),
            },
          });
        }
      });
      resourceObserver.observe({ type: "resource", buffered: true });
    } catch {
      resourceObserver = null;
    }
  }

  stopCapture = () => {
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("change", handleChange, true);
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    resourceObserver?.disconnect();
    stopCapture = null;
  };

  return releaseCaptureSubscriber;
}

function releaseCaptureSubscriber() {
  captureSubscribers = Math.max(0, captureSubscribers - 1);
  if (captureSubscribers === 0) stopCapture?.();
}

export function captureFeedbackContext(): FeedbackContextCapsule | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;

  const now = Date.now();
  const currentPage = sanitizeFeedbackUrl(window.location.href);
  const state = Object.fromEntries(scopedState.entries());
  const metrics = Object.fromEntries(webVitals.entries());

  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    capsuleId: createCapsuleId(),
    capturedAt: new Date(now).toISOString(),
    page: currentPage,
    client: {
      locale: document.documentElement.lang || navigator.language || "unknown",
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: roundMetric(window.devicePixelRatio || 1),
      online: navigator.onLine,
      visibility: document.visibilityState,
    },
    release:
      process.env.NEXT_PUBLIC_APP_VERSION ??
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
      "unknown",
    sessionAgeMs: Math.max(0, now - sessionStartedAt),
    navigation: getNavigationSnapshot(),
    webVitals: metrics,
    state,
    breadcrumbs: breadcrumbBuffer.snapshot(now),
  };
}

export function sanitizeFeedbackContext(input: unknown): FeedbackContextCapsule | null {
  if (!isRecord(input) || input.schemaVersion !== CONTEXT_SCHEMA_VERSION) return null;
  if (!isRecord(input.page) || !isRecord(input.client)) return null;

  const capsuleId = sanitizeKey(input.capsuleId, 64);
  const capturedAt = redactSensitiveText(input.capturedAt, 40);
  const rawPath = typeof input.page.path === "string" ? input.page.path : "/";
  const sanitizedPage = sanitizeFeedbackUrl(rawPath);
  const query: Record<string, string> = {};
  if (isRecord(input.page.query)) {
    for (const [key, value] of Object.entries(input.page.query)) {
      if (!SAFE_QUERY_KEYS.has(key) || typeof value !== "string") continue;
      if (/^[a-z0-9_.,:+-]{1,48}$/i.test(value)) query[key] = value;
    }
  }

  if (!capsuleId || !capturedAt || Number.isNaN(Date.parse(capturedAt))) return null;

  const client = {
    locale: redactSensitiveText(input.client.locale, 24) ?? "unknown",
    viewportWidth: clampNumber(input.client.viewportWidth, 0, 10_000) ?? 0,
    viewportHeight: clampNumber(input.client.viewportHeight, 0, 10_000) ?? 0,
    devicePixelRatio: clampNumber(input.client.devicePixelRatio, 0, 10) ?? 1,
    online: typeof input.client.online === "boolean" ? input.client.online : false,
    visibility: sanitizeKey(input.client.visibility, 24) ?? "unknown",
  };

  const state: FeedbackContextCapsule["state"] = {};
  if (isRecord(input.state)) {
    for (const [rawScope, rawValues] of Object.entries(input.state).slice(0, 8)) {
      const scope = sanitizeKey(rawScope, 48);
      const values = sanitizeMetadata(rawValues);
      if (scope && values) state[scope] = values;
    }
  }

  const breadcrumbs: FeedbackBreadcrumb[] = [];
  if (Array.isArray(input.breadcrumbs)) {
    for (const rawEntry of input.breadcrumbs.slice(-MAX_BREADCRUMBS)) {
      if (!isRecord(rawEntry)) continue;
      const type = BREADCRUMB_TYPES.find((candidate) => candidate === rawEntry.type);
      const name = sanitizeKey(rawEntry.name, 80);
      const ageMs = clampNumber(rawEntry.ageMs, 0, CONTEXT_WINDOW_MS);
      if (!type || !name || ageMs === null) continue;
      const metadata = sanitizeMetadata(rawEntry.metadata);
      breadcrumbs.push({ ageMs, type, name, ...(metadata ? { metadata } : {}) });
    }
  }

  const sanitizedVitals: FeedbackContextCapsule["webVitals"] = {};
  if (isRecord(input.webVitals)) {
    for (const [rawName, rawMetric] of Object.entries(input.webVitals).slice(0, 8)) {
      if (!isRecord(rawMetric)) continue;
      const name = sanitizeKey(rawName, 16);
      const value = clampNumber(rawMetric.value, 0, 1_000_000);
      const rating = sanitizeKey(rawMetric.rating, 16);
      if (name && value !== null && rating) sanitizedVitals[name] = { value, rating };
    }
  }

  let navigation: FeedbackContextCapsule["navigation"];
  if (isRecord(input.navigation)) {
    const type = sanitizeKey(input.navigation.type, 24);
    const ttfbMs = clampNumber(input.navigation.ttfbMs, 0, 3_600_000);
    const domInteractiveMs = clampNumber(input.navigation.domInteractiveMs, 0, 3_600_000);
    const domContentLoadedMs = clampNumber(input.navigation.domContentLoadedMs, 0, 3_600_000);
    const loadMs = clampNumber(input.navigation.loadMs, 0, 3_600_000);
    if (
      type &&
      ttfbMs !== null &&
      domInteractiveMs !== null &&
      domContentLoadedMs !== null &&
      loadMs !== null
    ) {
      navigation = { type, ttfbMs, domInteractiveMs, domContentLoadedMs, loadMs };
    }
  }

  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    capsuleId,
    capturedAt,
    page: { path: sanitizedPage.path, query },
    client,
    release: sanitizeKey(input.release, 80) ?? "unknown",
    sessionAgeMs: clampNumber(input.sessionAgeMs, 0, 86_400_000) ?? 0,
    ...(navigation ? { navigation } : {}),
    webVitals: sanitizedVitals,
    state,
    breadcrumbs,
  };
}
