export function isMultiSearchEnabled(): boolean {
  return (
    process.env.ENABLE_MULTI_SEARCH === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_MULTI_SEARCH === "true"
  );
}
