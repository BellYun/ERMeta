import { redirect } from "next/navigation";

interface CharacterLabRolePageProps {
  params: Promise<{ locale: string; role: string }>;
}

export default async function CharacterLabRolePage({ params }: CharacterLabRolePageProps) {
  const { locale } = await params;
  redirect(`/${locale}/composition-lab`);
}
