"use client"

import * as amplitude from "@amplitude/unified"
import { useEffect } from "react"

export function AmplitudeProvider() {
  useEffect(() => {
    amplitude.initAll("2559c76a80449aaf8aa57b624f7b66a5", {
      analytics: { autocapture: true },
      sessionReplay: { sampleRate: 1 },
    })
  }, [])

  return null
}
