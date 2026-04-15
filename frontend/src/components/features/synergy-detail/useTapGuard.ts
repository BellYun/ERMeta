"use client";

import * as React from "react";

/**
 * 모바일 onPointerUp 핸들러용 스크롤 가드 훅.
 *
 * 배경:
 *  - onPointerUp 은 onClick 과 달리 "터치 후 손가락이 움직여 스크롤이 발생해도" 그대로 발사된다.
 *    가상화 그리드(maxHeight overflow-y:auto)나 페이지 전체 스크롤 도중 셀/카드 위에서
 *    손가락을 떼면 우연 트리거가 일어남.
 *  - 자체 격리 실험(.omc/touch-delay-jscontention-2026-04-15.md): pointerup 좌표만 비교하면
 *    "갔다 다시 내려옴" 케이스를 못 거름. pointermove 단계에서 누적 거리로 invalidate 해야 함.
 *
 * 사용법:
 *   const tap = useTapGuard(() => activate());
 *   <div role="button" tabIndex={0} {...tap}
 *        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } }}>
 *
 * SLOP=10px 는 iOS 의 기본 더블탭/탭 이동 허용 범위와 동일.
 */
export function useTapGuard(onActivate: (e: React.PointerEvent) => void) {
  const startRef = React.useRef<{ x: number; y: number; id: number } | null>(null);
  const TAP_SLOP = 10;
  const SLOP_SQ = TAP_SLOP * TAP_SLOP;

  const onPointerDown = React.useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    startRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }, []);

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      const s = startRef.current;
      if (!s || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (dx * dx + dy * dy > SLOP_SQ) startRef.current = null;
    },
    [SLOP_SQ]
  );

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const s = startRef.current;
      startRef.current = null;
      if (!s || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (dx * dx + dy * dy > SLOP_SQ) return;
      onActivate(e);
    },
    [SLOP_SQ, onActivate]
  );

  const onPointerCancel = React.useCallback(() => {
    startRef.current = null;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
