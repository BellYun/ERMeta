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

  const handleDragStart = (clientX: number) => {
    stopAutoSlide()
    setIsDragging(true)
    setDragStartX(clientX)
    setDragOffset(0)
  }

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return
    setDragOffset(clientX - dragStartX)
  }

  const handleDragEnd = () => {
    if (!isDragging) return
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
    startAutoSlide()
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
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    stopAutoSlide,
    startAutoSlide,
  }
}
