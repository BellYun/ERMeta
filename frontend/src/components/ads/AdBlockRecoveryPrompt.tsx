"use client";

import { AlertTriangle, Check, HeartHandshake, Loader2, RefreshCw, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AD_BLOCK_RECOVERY_MODE,
  ADSENSE_CLIENT,
  ADSENSE_PREVIEW,
} from "@/components/ads/adsenseConfig";
import { canLoadAds } from "@/components/ads/AdSenseScript";
import type { RouteLocale } from "@/i18n/routing";
import {
  consumeRecentAdBlockRecoveryAttempt,
  getRandomExperimentBucket,
  isAdBlockRecoveryPromptSuppressed,
  markAdBlockRecoveryAttempt,
  resolveAdBlockRecoveryVariant,
  suppressAdBlockRecoveryPrompt,
  type AdBlockRecoveryDismissReason,
  type AdBlockRecoveryVariant,
  type StorageLike,
} from "@/lib/adBlockRecoveryExperiment";
import { analytics } from "@/lib/analytics";

const DETECTION_DELAY_MS = 3000;

const memoryStorageValues = new Map<string, string>();
const memoryStorage: StorageLike = {
  getItem: (key) => memoryStorageValues.get(key) ?? null,
  setItem: (key, value) => memoryStorageValues.set(key, value),
  removeItem: (key) => memoryStorageValues.delete(key),
};

export type AdBlockRecoveryUiState =
  | "default"
  | "hover"
  | "focus"
  | "active"
  | "disabled"
  | "loading"
  | "error"
  | "success";

interface PromptCopy {
  title: string;
  body: string;
  instruction: string;
  primary: string;
  later: string;
  close: string;
  loading: string;
  error: string;
  success: string;
  privacy: string;
}

const COPY: Record<RouteLocale, Record<AdBlockRecoveryVariant, PromptCopy>> = {
  ko: {
    context: {
      title: "잠깐, 작은 부탁 하나만 드릴게요",
      body: "ER&GG를 운영하려면 서버비와 데이터 유지 비용이 들어요. 광고를 허용해 주시면 지금처럼 무료로 계속 제공하는 데 큰 도움이 됩니다.",
      instruction: "괜찮으시다면 광고 차단기에서 ER&GG만 허용해 주신 뒤 새로고침해 주세요.",
      primary: "광고 허용하고 새로고침",
      later: "다음에 도울게요",
      close: "광고 안내 닫기",
      loading: "확인하는 중…",
      error: "새로고침이 되지 않았어요. 번거롭겠지만 브라우저에서 한 번만 직접 새로고침해 주세요.",
      success: "고맙습니다. 광고 허용을 확인했어요.",
      privacy: "광고 차단 여부만 브라우저에서 확인합니다. 차단기 설정은 보거나 저장하지 않아요.",
    },
    direct: {
      title: "ER&GG에서 광고를 허용해 주세요",
      body: "광고 수익은 서버와 데이터 운영에 사용됩니다.",
      instruction: "광고 차단기에서 이 사이트를 허용한 뒤 새로고침해 주세요.",
      primary: "허용했어요 · 새로고침",
      later: "광고 차단 유지",
      close: "광고 안내 닫기",
      loading: "확인하는 중…",
      error: "새로고침이 되지 않았어요. 번거롭겠지만 브라우저에서 한 번만 직접 새로고침해 주세요.",
      success: "고맙습니다. 광고 허용을 확인했어요.",
      privacy: "광고 차단 여부만 브라우저에서 확인합니다. 차단기 설정은 보거나 저장하지 않아요.",
    },
  },
  en: {
    context: {
      title: "Could we ask a small favor?",
      body: "ER&GG has server and data costs behind it. Allowing ads helps us keep everything free to use.",
      instruction: "If you don’t mind, allow ads just for ER&GG in your blocker, then refresh.",
      primary: "Allow ads and refresh",
      later: "Maybe next time",
      close: "Close ad notice",
      loading: "Checking…",
      error: "The page did not refresh. Please refresh it once from your browser.",
      success: "Thank you — ads are now allowed.",
      privacy:
        "We only check whether ads are blocked in your browser. We never view or save your blocker settings.",
    },
    direct: {
      title: "Allow ads on ER&GG",
      body: "Ad revenue keeps our servers and data running.",
      instruction: "Allow this site in your ad blocker, then refresh.",
      primary: "Allowed · Refresh",
      later: "Keep blocking",
      close: "Close ad notice",
      loading: "Checking…",
      error: "The page did not refresh. Please refresh it once from your browser.",
      success: "Thank you — ads are now allowed.",
      privacy:
        "We only check whether ads are blocked in your browser. We never view or save your blocker settings.",
    },
  },
  ja: {
    context: {
      title: "少しだけ、お願いがあります",
      body: "ER&GGの運営には、サーバーやデータ維持の費用がかかります。広告を許可していただけると、これからも無料で続ける大きな支えになります。",
      instruction: "よろしければ、広告ブロッカーでER&GGだけを許可してから再読み込みしてください。",
      primary: "協力して再読み込み",
      later: "また今度",
      close: "広告の案内を閉じる",
      loading: "確認中…",
      error:
        "再読み込みできませんでした。お手数ですが、ブラウザから一度だけ再読み込みしてください。",
      success: "ありがとうございます。広告の許可を確認しました。",
      privacy:
        "広告がブロックされているかだけをブラウザで確認します。ブロッカーの設定を見たり保存したりはしません。",
    },
    direct: {
      title: "ER&GGの広告を許可してください",
      body: "広告収益はサーバーとデータ運営に使われます。",
      instruction: "広告ブロッカーでこのサイトを許可して、再読み込みしてください。",
      primary: "許可した · 再読み込み",
      later: "ブロックを続ける",
      close: "広告の案内を閉じる",
      loading: "確認中…",
      error:
        "再読み込みできませんでした。お手数ですが、ブラウザから一度だけ再読み込みしてください。",
      success: "ありがとうございます。広告の許可を確認しました。",
      privacy:
        "広告がブロックされているかだけをブラウザで確認します。ブロッカーの設定を見たり保存したりはしません。",
    },
  },
  "zh-Hans": {
    context: {
      title: "想拜托你一件小事",
      body: "ER&GG 的服务器和数据维护都需要成本。允许广告，就能帮我们继续免费提供这些内容。",
      instruction: "如果你愿意，请在广告拦截器中只允许 ER&GG，然后刷新页面。",
      primary: "允许广告并刷新",
      later: "下次再说",
      close: "关闭广告提示",
      loading: "正在检查…",
      error: "页面没能刷新。麻烦你在浏览器中手动刷新一次。",
      success: "谢谢，已确认允许广告。",
      privacy: "我们只会在浏览器中检查广告是否被拦截，不会查看或保存你的拦截器设置。",
    },
    direct: {
      title: "请允许 ER&GG 显示广告",
      body: "广告收入用于服务器和数据运营。",
      instruction: "请在广告拦截器中允许此网站，然后刷新页面。",
      primary: "已允许 · 刷新",
      later: "继续拦截",
      close: "关闭广告提示",
      loading: "正在检查…",
      error: "页面没能刷新。麻烦你在浏览器中手动刷新一次。",
      success: "谢谢，已确认允许广告。",
      privacy: "我们只会在浏览器中检查广告是否被拦截，不会查看或保存你的拦截器设置。",
    },
  },
  "zh-Hant": {
    context: {
      title: "想拜託你一件小事",
      body: "ER&GG 的伺服器和資料維護都需要成本。允許廣告，就能幫助我們繼續免費提供這些內容。",
      instruction: "如果你願意，請在廣告攔截器中只允許 ER&GG，然後重新整理頁面。",
      primary: "允許廣告並重新整理",
      later: "下次再說",
      close: "關閉廣告提示",
      loading: "正在檢查…",
      error: "頁面沒能重新整理。麻煩你在瀏覽器中手動重新整理一次。",
      success: "謝謝，已確認允許廣告。",
      privacy: "我們只會在瀏覽器中檢查廣告是否被攔截，不會查看或儲存你的攔截器設定。",
    },
    direct: {
      title: "請允許 ER&GG 顯示廣告",
      body: "廣告收入用於伺服器和資料營運。",
      instruction: "請在廣告攔截器中允許此網站，然後重新整理頁面。",
      primary: "已允許 · 重新整理",
      later: "繼續攔截",
      close: "關閉廣告提示",
      loading: "正在檢查…",
      error: "頁面沒能重新整理。麻煩你在瀏覽器中手動重新整理一次。",
      success: "謝謝，已確認允許廣告。",
      privacy: "我們只會在瀏覽器中檢查廣告是否被攔截，不會查看或儲存你的攔截器設定。",
    },
  },
};

const SUCCESS_ACTION: Record<RouteLocale, string> = {
  ko: "확인 완료",
  en: "Ads allowed",
  ja: "確認しました",
  "zh-Hans": "已确认",
  "zh-Hant": "已確認",
};

function resolveLocale(pathname: string): RouteLocale {
  const routeLocale = pathname.split("/")[1];
  if (
    routeLocale === "en" ||
    routeLocale === "ja" ||
    routeLocale === "zh-Hans" ||
    routeLocale === "zh-Hant"
  ) {
    return routeLocale;
  }
  return "ko";
}

function resolvePreviewVariant(pathname: string, search: string): AdBlockRecoveryVariant | null {
  if (!pathname.includes("/design-lab")) return null;
  const previewVariant = new URLSearchParams(search).get("adblock-recovery-preview");
  return previewVariant === "context" || previewVariant === "direct" ? previewVariant : null;
}

function isBaitHidden(element: HTMLDivElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    style.display === "none" ||
    style.visibility === "hidden" ||
    rect.width === 0 ||
    rect.height === 0
  );
}

function getClientStorage(): StorageLike {
  try {
    return window.localStorage;
  } catch {
    return memoryStorage;
  }
}

interface AdBlockRecoveryPromptPanelProps {
  variant: AdBlockRecoveryVariant;
  locale: RouteLocale;
  uiState?: AdBlockRecoveryUiState;
  onReload?: () => void;
  onDismiss?: () => void;
  onClose?: () => void;
  primaryButtonRef?: React.RefObject<HTMLButtonElement | null>;
  preview?: boolean;
}

export function AdBlockRecoveryPromptPanel({
  variant,
  locale,
  uiState = "default",
  onReload,
  onDismiss,
  onClose,
  primaryButtonRef,
  preview = false,
}: AdBlockRecoveryPromptPanelProps) {
  const copy = COPY[locale]?.[variant] ?? COPY.ko[variant];
  const isLoading = uiState === "loading";
  const isDisabled = uiState === "disabled" || isLoading || uiState === "success";
  const statusMessage =
    uiState === "error" ? copy.error : uiState === "success" ? copy.success : null;

  return (
    <section
      className="ad-recovery-panel"
      data-variant={variant}
      data-ui-state={uiState}
      data-preview={preview ? "true" : undefined}
      aria-labelledby={preview ? undefined : "ad-recovery-title"}
      aria-describedby={preview ? undefined : "ad-recovery-description"}
    >
      <header className="ad-recovery-panel__header">
        <span className="ad-recovery-panel__signal" aria-hidden="true">
          <HeartHandshake />
        </span>
        <button
          type="button"
          className="ad-recovery-panel__close"
          onClick={onClose}
          aria-label={copy.close}
          disabled={isLoading}
        >
          <X aria-hidden="true" />
        </button>
      </header>

      <div className="ad-recovery-panel__copy">
        <h2 id={preview ? undefined : "ad-recovery-title"}>{copy.title}</h2>
        <p id={preview ? undefined : "ad-recovery-description"}>{copy.body}</p>
      </div>

      <div className="ad-recovery-panel__instruction">
        <span aria-hidden="true">1</span>
        <p>{copy.instruction}</p>
      </div>

      <div className="ad-recovery-panel__actions">
        <button
          ref={primaryButtonRef}
          type="button"
          className="ad-recovery-panel__primary"
          onClick={onReload}
          disabled={isDisabled}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <Loader2 className="ad-recovery-panel__spinner" aria-hidden="true" />
          ) : uiState === "success" ? (
            <Check aria-hidden="true" />
          ) : uiState === "error" ? (
            <AlertTriangle aria-hidden="true" />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}
          <span>
            {isLoading
              ? copy.loading
              : uiState === "success"
                ? SUCCESS_ACTION[locale]
                : copy.primary}
          </span>
        </button>
        <button
          type="button"
          className="ad-recovery-panel__later"
          onClick={onDismiss}
          disabled={isLoading}
        >
          {copy.later}
        </button>
      </div>

      <div
        className="ad-recovery-panel__status"
        data-tone={uiState === "error" ? "error" : uiState === "success" ? "success" : undefined}
        role={uiState === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {statusMessage ? (
          <>
            {uiState === "error" ? (
              <AlertTriangle aria-hidden="true" />
            ) : (
              <Check aria-hidden="true" />
            )}
            <span>{statusMessage}</span>
          </>
        ) : null}
      </div>

      <p className="ad-recovery-panel__privacy">{copy.privacy}</p>
    </section>
  );
}

export function AdBlockRecoveryPrompt() {
  const pathname = usePathname();
  const baitRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);
  const shownPathRef = useRef<string | null>(null);
  const dismissInProgressRef = useRef(false);
  const [variant, setVariant] = useState<AdBlockRecoveryVariant>("context");
  const [isOpen, setIsOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [uiState, setUiState] = useState<AdBlockRecoveryUiState>("default");
  const locale = resolveLocale(pathname);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    requestAnimationFrame(() => primaryButtonRef.current?.focus());
  }, [isOpen]);

  useEffect(() => {
    const previewVariant = resolvePreviewVariant(pathname, window.location.search);
    if (previewVariant) {
      const previewTimer = window.setTimeout(() => {
        setVariant(previewVariant);
        setIsPreviewMode(true);
        setUiState("default");
        dismissInProgressRef.current = false;
        setIsOpen(true);
      }, 0);
      return () => window.clearTimeout(previewTimer);
    }

    if (
      AD_BLOCK_RECOVERY_MODE === "off" ||
      !ADSENSE_CLIENT ||
      ADSENSE_PREVIEW ||
      !canLoadAds(pathname)
    ) {
      return;
    }
    const storage = getClientStorage();
    if (isAdBlockRecoveryPromptSuppressed(storage, Date.now())) return;

    let timerId: ReturnType<typeof setTimeout> | null = null;

    const runDetection = () => {
      if (document.visibilityState !== "visible" || navigator.onLine === false) return;
      const bait = baitRef.current;
      if (!bait) return;

      const blocked = isBaitHidden(bait);
      if (!blocked) {
        const attempt = consumeRecentAdBlockRecoveryAttempt(storage, Date.now());
        if (attempt) {
          analytics.adBlockRecoverySucceeded({
            variant: attempt.variant,
            attemptAgeMs: Date.now() - attempt.attemptedAt,
            attemptPagePath: attempt.pagePath,
            pagePath: pathname,
          });
        }
        return;
      }

      if (shownPathRef.current === pathname) return;
      const assignedVariant = resolveAdBlockRecoveryVariant(
        storage,
        AD_BLOCK_RECOVERY_MODE,
        getRandomExperimentBucket()
      );
      if (!assignedVariant) return;
      shownPathRef.current = pathname;
      setVariant(assignedVariant);
      setUiState("default");
      dismissInProgressRef.current = false;
      setIsOpen(true);
      analytics.adBlockRecoveryPromptShown({
        variant: assignedVariant,
        locale,
        pagePath: pathname,
        detectionMethod: "cosmetic_bait",
      });
    };

    const scheduleDetection = () => {
      if (timerId) clearTimeout(timerId);
      if (document.visibilityState !== "visible" || navigator.onLine === false) return;
      timerId = setTimeout(runDetection, DETECTION_DELAY_MS);
    };

    const handleVisibilityChange = () => scheduleDetection();
    const handleOnline = () => scheduleDetection();

    scheduleDetection();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      if (timerId) clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [locale, pathname]);

  const dismiss = useCallback(
    (reason: AdBlockRecoveryDismissReason) => {
      if (dismissInProgressRef.current) return;
      dismissInProgressRef.current = true;

      if (!isPreviewMode) {
        suppressAdBlockRecoveryPrompt(getClientStorage(), Date.now());
        analytics.adBlockRecoveryPromptDismissed({
          variant,
          reason,
          locale,
          pagePath: pathname,
        });
      }
      setIsOpen(false);
      setUiState("default");
    },
    [isPreviewMode, locale, pathname, variant]
  );

  const handleReload = useCallback(() => {
    if (isPreviewMode) {
      setUiState("loading");
      window.setTimeout(() => setUiState("success"), 500);
      return;
    }

    const now = Date.now();
    markAdBlockRecoveryAttempt(getClientStorage(), {
      variant,
      attemptedAt: now,
      pagePath: pathname,
    });
    analytics.adBlockRecoveryReloadRequested({
      variant,
      locale,
      pagePath: pathname,
    });
    setUiState("loading");

    window.setTimeout(() => {
      try {
        window.location.reload();
      } catch {
        setUiState("error");
      }
    }, 120);
  }, [isPreviewMode, locale, pathname, variant]);

  return (
    <>
      <div
        ref={baitRef}
        className="adsbox ad-banner ad-unit advertisement"
        aria-hidden="true"
        style={{
          position: "fixed",
          insetInlineStart: "-10000px",
          top: "-10000px",
          width: "1px",
          height: "1px",
          pointerEvents: "none",
        }}
      />

      {isOpen ? (
        <dialog
          ref={dialogRef}
          className="ad-recovery-dialog"
          aria-label={COPY[locale][variant].title}
          onCancel={(event) => {
            event.preventDefault();
            dismiss("escape");
          }}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            dismiss("escape");
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) dismiss("backdrop");
          }}
        >
          <AdBlockRecoveryPromptPanel
            variant={variant}
            locale={locale}
            uiState={uiState}
            onReload={handleReload}
            onDismiss={() => dismiss("later")}
            onClose={() => dismiss("close")}
            primaryButtonRef={primaryButtonRef}
          />
        </dialog>
      ) : null}
    </>
  );
}
