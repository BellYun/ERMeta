import { redirect } from "next/navigation";

interface NewCharacterLabRoleRouteProps {
  params: Promise<{ locale: string }>;
}

export default async function NewCharacterLabRoleRoute({ params }: NewCharacterLabRoleRouteProps) {
  const { locale } = await params;
  redirect(`/${locale}/composition-lab`);
}
