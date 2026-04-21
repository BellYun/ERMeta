/**
 * 모바일 기기 여부 감지.
 * 1) navigator.userAgentData.mobile (Chromium 기반, 가장 신뢰 가능)
 * 2) UA 정규식 (iOS Safari/Firefox 등)
 * 3) iPadOS 13+ "Request Desktop Site" 케이스: maxTouchPoints + Macintosh
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;

  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (typeof uaData?.mobile === "boolean") return uaData.mobile;

  if (/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent)) {
    return true;
  }

  if (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) {
    return true;
  }

  return false;
}
