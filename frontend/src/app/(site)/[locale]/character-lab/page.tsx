import FrozenCharacterAffinityPage from "./FrozenCharacterAffinityPage";

interface CharacterLabPageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-static";
export { generateMetadata } from "./NewCharacterLabPage";

export default function CharacterLabPage({ params }: CharacterLabPageProps) {
  return <FrozenCharacterAffinityPage params={params} />;
}
