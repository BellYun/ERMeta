"use client"

import * as React from "react"
import type { HoneyPickData } from "@/app/api/meta/honey-picks/route"

export const AUTO_SLIDE_INTERVAL = 4000

// 반응형 카드 너비: 모바일 80%, 태블릿 40%, 데스크탑 30%
export function useCardWidthPercent() {
  const [width, setWidth] = React.useState(30)
  React.useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setWidth(80)
      else if (window.innerWidth < 1024) setWidth(40)
      else setWidth(30)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])
  return width
}

export function useCarousel(picks: HoneyPickData[]) {
  const cardWidth = useCardWidthPercent()
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isTransitioning, setIsTransitioning] = React.useState(true)
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStartX, setDragStartX] = React.useState(0)
  const [dragOffset, setDragOffset] = React.useState(0)
  const autoSlideRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const visibleCount = Math.ceil(100 / cardWidth) + 1
  const cloneCount = visibleCount

  const extendedPicks = React.useMemo(() => {
    if (picks.length === 0) return []
    const len = picks.length
    const before = Array.from({ length: cloneCount }, (_, i) => picks[(len - cloneCount + i) % len])
    const after = Array.from({ length: cloneCount }, (_, i) => picks[i % len])
    return [...before, ...picks, ...after]
  }, [picks, cloneCount])

  const startAutoSlide = React.useCallback(() => {
    if (autoSlideRef.current) clearInterval(autoSlideRef.current)
    autoSlideRef.current = setInterval(() => {
      setIsTransitioning(true)
      setCurrentIndex((prev) => prev + 1)
    }, AUTO_SLIDE_INTERVAL)
  }, [])

  const stopAutoSlide = React.useCallback(() => {
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current)
      autoSlideRef.current = null
    }
  }, [])

  React.useEffect(() => {
    if (picks.length <= 1) return
    setCurrentIndex(cloneCount)
    startAutoSlide()
    return stopAutoSlide
  }, [picks, startAutoSlide, stopAutoSlide])

  // 무한 루프 경계 처리
  React.useEffect(() => {
    if (picks.length <= 1) return

    if (currentIndex >= picks.length + cloneCount) {
      const timer = setTimeout(() => {
        setIsTransitioning(false)
        setCurrentIndex(cloneCount)
      }, 500)
      return () => clearTimeout(timer)
    }

    if (currentIndex < cloneCount) {
      const timer = setTimeout(() => {
        setIsTransitioning(false)
        setCurrentIndex(picks.length + cloneCount - 1)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, picks.length])

  // 점프 후 트랜지션 재활성화
  React.useEffect(() => {
    if (!isTransitioning) {
      const timer = setTimeout(() => setIsTransitioning(true), 50)
      return () => clearTimeout(timer)
    }
  }, [isTransitioning])

  const dragStartY = React.useRef(0)
  const isHorizontalDrag = React.useRef(false)
  const dragDetermined = React.useRef(false)

  const handleDragStart = (clientX: number, clientY?: number) => {
    stopAutoSlide()
    setIsDragging(true)
    setDragStartX(clientX)
    dragStartY.current = clientY ?? 0
    isHorizontalDrag.current = false
    dragDetermined.current = false
    setDragOffset(0)
  }

  const handleDragMove = (clientX: number, clientY?: number) => {
    if (!isDragging) return
    const dx = clientX - dragStartX
    const dy = (clientY ?? 0) - dragStartY.current

    // 방향 판별: 수평이면 캐러셀, 수직이면 스크롤
    if (!dragDetermined.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      dragDetermined.current = true
      isHorizontalDrag.current = Math.abs(dx) > Math.abs(dy)
    }

    if (!isHorizontalDrag.current) return
    setDragOffset(dx)
  }

  const handleDragEnd = () => {
    if (!isDragging) return
    const wasDragging = Math.abs(dragOffset) > 5
    setIsDragging(false)
    const threshold = 50
    if (dragOffset < -threshold) {
      setIsTransitioning(true)
      setCurrentIndex((prev) => prev + 1)
    } else if (dragOffset > threshold) {
      setIsTransitioning(true)
      setCurrentIndex((prev) => prev - 1)
    }
    setDragOffset(0)
    dragDetermined.current = false
    isHorizontalDrag.current = false
    startAutoSlide()
    return wasDragging
  }

  const activeRealIndex = ((currentIndex - cloneCount) % picks.length + picks.length) % picks.length
  const translateX = -(currentIndex * cardWidth) + (50 - cardWidth / 2)

  return {
    currentIndex,
    setCurrentIndex,
    isTransitioning,
    setIsTransitioning,
    extendedPicks,
    activeRealIndex,
    translateX,
    cardWidth,
    cloneCount,
    dragOffset,
    isDragging,
    isHorizontalDrag,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    stopAutoSlide,
    startAutoSlide,
  }
}
