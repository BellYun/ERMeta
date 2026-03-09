import type { Metadata } from "next"
import { SynergyClient } from "@/components/features/SynergyClient"

export const metadata: Metadata = {
  title: "메타 분석 | ERMeta",
  description: "이터널리턴 캐릭터 티어, 픽률, 승률 통계 분석.",
}

export default function SynergyPage() {
  return <SynergyClient />
}
