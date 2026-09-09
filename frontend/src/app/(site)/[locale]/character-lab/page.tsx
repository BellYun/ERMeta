import { redirect } from "next/navigation";

interface CharacterLabPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CharacterLabPage({ params }: CharacterLabPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/composition-lab`);
}
