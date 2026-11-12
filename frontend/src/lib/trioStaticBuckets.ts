import trioSnapshot from "@/data/trio-builder-snapshot.json";

export function getTrioWeaponBucketUrl(character: number, weapon: number): string {
  return `/data/trio-builder/${trioSnapshot.version}/${character}-${weapon}.json`;
}
