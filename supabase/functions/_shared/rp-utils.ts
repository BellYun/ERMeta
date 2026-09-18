/** RP 지표는 12.4부터 갬빗 배율과 입장료를 제외한 경기 중 기본 획득 점수를 사용한다. */
export function getCollectedRP(
  patchVersion: string,
  mmrBefore: number,
  mmrAfter: number,
  mmrGainInGame: number | null | undefined,
): number | null {
  const [major, minor] = patchVersion.split(".").map(Number);
  const netRP = mmrAfter - mmrBefore;
  if (major < 12 || (major === 12 && minor < 4)) return netRP;

  // 순 RP와 실제 입장료에는 갬빗 배율 및 승급 보너스가 섞일 수 있다.
  // 이 둘을 역산하지 않고 BSER의 경기 중 기본 획득 점수만 사용한다.
  if (typeof mmrGainInGame === "number" && Number.isFinite(mmrGainInGame)) {
    return mmrGainInGame;
  }
  return null;
}
