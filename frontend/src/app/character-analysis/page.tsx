import { redirect } from "next/navigation"

interface Props {
  searchParams: Promise<{ character?: string }>
}

/**
 * 기존 /character-analysis URL 호환을 위한 리다이렉트.
 * ?character=N → /character/N, 파라미터 없으면 /character/1
 */
export default async function CharacterAnalysisRedirect({ searchParams }: Props) {
  const { character } = await searchParams
  const code = character ? parseInt(character, 10) : NaN
  const target = !isNaN(code) && code > 0 ? `/character/${code}` : "/character/1"
  redirect(target)
}
