import { LegacyCharacterLabPage } from "./LegacyCharacterLabPage";

interface CharacterLabPageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-dynamic";
export { generateMetadata } from "./NewCharacterLabPage";

export default function CharacterLabPage({ params }: CharacterLabPageProps) {
  return <LegacyCharacterLabPage params={params} />;
}
