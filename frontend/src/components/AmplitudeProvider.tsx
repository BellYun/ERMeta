"use client"

import * as amplitude from "@amplitude/analytics-browser"
import { useEffect } from "react"

export function AmplitudeProvider() {
  useEffect(() => {
    try {
      amplitude.init("2559c76a80449aaf8aa57b624f7b66a5", {
        autocapture: true,
      })
    } catch (err) {
      console.error("[Amplitude] init failed:", err)
    }
  }, [])

  return null
}
