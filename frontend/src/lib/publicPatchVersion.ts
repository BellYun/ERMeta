export const MAX_PUBLIC_PATCH_VERSION = "12.7";

export function comparePatchVersionsDescending(left: string, right: string): number {
  const [leftMajor, leftMinor] = left.split(".").map(Number);
  const [rightMajor, rightMinor] = right.split(".").map(Number);
  return rightMajor - leftMajor || rightMinor - leftMinor;
}

export function isPublicPatchVersion(version: string): boolean {
  return (
    /^\d+\.\d+$/.test(version) &&
    comparePatchVersionsDescending(version, MAX_PUBLIC_PATCH_VERSION) >= 0
  );
}
