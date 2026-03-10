"use client"

import * as amplitude from "@amplitude/unified"
import { useEffect } from "react"

export function AmplitudeProvider() {
  useEffect(() => {
    try {
      amplitude.initAll("2559c76a80449aaf8aa57b624f7b66a5", {
        analytics: { autocapture: true },
        sessionReplay: {
          sampleRate: 1,
          privacyConfig: {
            blockSelector: "[data-sr-block]",
          },
        },
      })
    } catch (err) {
      console.error("[Amplitude] init failed:", err)
    }
  }, [])

  return null
}
