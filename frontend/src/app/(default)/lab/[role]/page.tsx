import { notFound, redirect } from "next/navigation";

const SUPPORTED_ROLES = ["rangers", "skilldealers", "tanks", "warriors"] as const;

interface Props {
  params: Promise<{ role: string }>;
}

export function generateStaticParams() {
  return SUPPORTED_ROLES.map((role) => ({ role }));
}

export default async function LabRoleRedirectPage({ params }: Props) {
  const { role } = await params;

  if (!SUPPORTED_ROLES.includes(role as (typeof SUPPORTED_ROLES)[number])) {
    notFound();
  }

  redirect(`/ko/character-lab/${role}`);
}
