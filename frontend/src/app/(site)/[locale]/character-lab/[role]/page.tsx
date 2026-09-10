import { LegacyCharacterLabRolePage } from "./LegacyCharacterLabRolePage";

interface CharacterLabRolePageProps {
  params: Promise<{ locale: string; role: string }>;
}

export const dynamic = "force-dynamic";
export const dynamicParams = false;
export { generateMetadata, generateStaticParams } from "./NewCharacterLabRolePage";

export default function CharacterLabRolePage({ params }: CharacterLabRolePageProps) {
  return <LegacyCharacterLabRolePage params={params} />;
}
