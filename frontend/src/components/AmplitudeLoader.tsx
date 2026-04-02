"use client"

import dynamic from "next/dynamic"

const AmplitudeProvider = dynamic(
  () => import("@/components/AmplitudeProvider").then((m) => ({ default: m.AmplitudeProvider })),
  { ssr: false },
)

export function AmplitudeLoader() {
  return <AmplitudeProvider />
}
