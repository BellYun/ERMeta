import { redirect } from "next/navigation";

interface NewCharacterLabRouteProps {
  params: Promise<{ locale: string }>;
}

export default async function NewCharacterLabRoute({ params }: NewCharacterLabRouteProps) {
  const { locale } = await params;
  redirect(`/${locale}/composition-lab`);
}
