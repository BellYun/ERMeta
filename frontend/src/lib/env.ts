const requiredEnvKeys = [
  "BSER_API_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
] as const;

const supabaseKeyFallback = "NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY";

type RequiredEnvKey =
  | (typeof requiredEnvKeys)[number]
  | typeof supabaseKeyFallback;

export function getMissingRequiredEnv(): RequiredEnvKey[] {
  const missing: RequiredEnvKey[] = requiredEnvKeys.filter(
    (key) => !process.env[key],
  );

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    missing.push(supabaseKeyFallback);
  }

  return missing;
}
