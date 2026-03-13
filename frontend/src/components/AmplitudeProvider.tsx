"use client"

import { useEffect } from "react"

export function AmplitudeProvider() {
  useEffect(() => {
    import("@amplitude/analytics-browser")
      .then((amplitude) => {
        amplitude.init("2559c76a80449aaf8aa57b624f7b66a5", {
          autocapture: true,
        })
      })
      .catch((err) => {
        console.error("[Amplitude] init failed:", err)
      })
  }, [])

  return null
}
