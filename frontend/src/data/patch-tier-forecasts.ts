import type { Tier } from "@/lib/design-tokens";

export interface PatchTierForecast {
  weaponCode: number;
  currentTier: Tier;
  tierLow: Tier;
  tierMid: Tier;
  tierHigh: Tier;
  reason: string;
}

type StoredPatchTierForecast = Omit<PatchTierForecast, "reason">;

// 2026-09-02 기준 12.2 다이아+ 누적 지표를 바탕으로, 무기군별 스킬 사용 빈도와
// 무기 스킬·장비의 간접 변경 및 12.2 예측 오차를 함께 검토한 보수적인 사전 예측입니다.
// 실제 12.3 관측 티어와 구분하기 위해 패치 아카이브에서는 항상 "예상"으로 표시합니다.
const PATCH_TIER_FORECASTS: Record<
  string,
  Readonly<Record<number, readonly StoredPatchTierForecast[]>>
> = {
  "12.3": {
    1: [
      { weaponCode: 14, currentTier: "A", tierLow: "B", tierMid: "B", tierHigh: "A" },
      { weaponCode: 15, currentTier: "A", tierLow: "D", tierMid: "C", tierHigh: "C" },
      { weaponCode: 18, currentTier: "B", tierLow: "C", tierMid: "B", tierHigh: "B" },
      { weaponCode: 16, currentTier: "C", tierLow: "C", tierMid: "C", tierHigh: "B" },
    ],
    3: [
      { weaponCode: 21, currentTier: "A", tierLow: "B", tierMid: "A", tierHigh: "A" },
      { weaponCode: 16, currentTier: "C", tierLow: "C", tierMid: "C", tierHigh: "B" },
      { weaponCode: 19, currentTier: "C", tierLow: "C", tierMid: "C", tierHigh: "B" },
    ],
    6: [{ weaponCode: 8, currentTier: "B", tierLow: "C", tierMid: "B", tierHigh: "B" }],
    8: [{ weaponCode: 22, currentTier: "C", tierLow: "B", tierMid: "B", tierHigh: "B" }],
    10: [
      { weaponCode: 20, currentTier: "B", tierLow: "B", tierMid: "A", tierHigh: "A" },
      { weaponCode: 1, currentTier: "B", tierLow: "B", tierMid: "A", tierHigh: "A" },
    ],
    11: [
      { weaponCode: 16, currentTier: "S", tierLow: "A", tierMid: "A", tierHigh: "S" },
      { weaponCode: 18, currentTier: "B", tierLow: "C", tierMid: "B", tierHigh: "B" },
    ],
    12: [{ weaponCode: 7, currentTier: "A", tierLow: "B", tierMid: "A", tierHigh: "A" }],
    13: [{ weaponCode: 19, currentTier: "C", tierLow: "C", tierMid: "C", tierHigh: "B" }],
    14: [{ weaponCode: 21, currentTier: "B", tierLow: "C", tierMid: "B", tierHigh: "B" }],
    15: [
      { weaponCode: 5, currentTier: "B", tierLow: "C", tierMid: "B", tierHigh: "B" },
      { weaponCode: 6, currentTier: "C", tierLow: "C", tierMid: "C", tierHigh: "B" },
    ],
    18: [{ weaponCode: 15, currentTier: "C", tierLow: "C", tierMid: "C", tierHigh: "B" }],
    23: [{ weaponCode: 18, currentTier: "S", tierLow: "B", tierMid: "A", tierHigh: "A" }],
    28: [
      { weaponCode: 3, currentTier: "A", tierLow: "B", tierMid: "B", tierHigh: "A" },
      { weaponCode: 13, currentTier: "C", tierLow: "D", tierMid: "D", tierHigh: "C" },
    ],
    29: [
      { weaponCode: 1, currentTier: "A", tierLow: "B", tierMid: "B", tierHigh: "A" },
      { weaponCode: 2, currentTier: "B", tierLow: "C", tierMid: "B", tierHigh: "B" },
    ],
    33: [{ weaponCode: 1, currentTier: "B", tierLow: "C", tierMid: "B", tierHigh: "B" }],
    34: [{ weaponCode: 23, currentTier: "A", tierLow: "A", tierMid: "S", tierHigh: "S" }],
    35: [
      { weaponCode: 1, currentTier: "C", tierLow: "B", tierMid: "B", tierHigh: "B" },
      { weaponCode: 2, currentTier: "C", tierLow: "C", tierMid: "C", tierHigh: "B" },
    ],
    37: [{ weaponCode: 15, currentTier: "B", tierLow: "C", tierMid: "B", tierHigh: "B" }],
    39: [
      { weaponCode: 18, currentTier: "A", tierLow: "B", tierMid: "B", tierHigh: "B" },
      { weaponCode: 21, currentTier: "B", tierLow: "C", tierMid: "C", tierHigh: "B" },
    ],
    42: [{ weaponCode: 24, currentTier: "C", tierLow: "B", tierMid: "B", tierHigh: "A" }],
    45: [{ weaponCode: 4, currentTier: "C", tierLow: "C", tierMid: "C", tierHigh: "C" }],
    50: [{ weaponCode: 21, currentTier: "B", tierLow: "C", tierMid: "B", tierHigh: "B" }],
    51: [{ weaponCode: 22, currentTier: "B", tierLow: "B", tierMid: "B", tierHigh: "A" }],
    52: [{ weaponCode: 24, currentTier: "B", tierLow: "B", tierMid: "A", tierHigh: "A" }],
    57: [{ weaponCode: 23, currentTier: "B", tierLow: "C", tierMid: "C", tierHigh: "B" }],
    61: [{ weaponCode: 5, currentTier: "B", tierLow: "C", tierMid: "B", tierHigh: "B" }],
    63: [{ weaponCode: 15, currentTier: "A", tierLow: "C", tierMid: "B", tierHigh: "B" }],
    66: [{ weaponCode: 24, currentTier: "B", tierLow: "B", tierMid: "A", tierHigh: "A" }],
    69: [{ weaponCode: 9, currentTier: "D", tierLow: "D", tierMid: "D", tierHigh: "D" }],
    71: [{ weaponCode: 14, currentTier: "B", tierLow: "B", tierMid: "A", tierHigh: "A" }],
    73: [{ weaponCode: 24, currentTier: "D", tierLow: "D", tierMid: "D", tierHigh: "D" }],
    74: [{ weaponCode: 3, currentTier: "A", tierLow: "B", tierMid: "B", tierHigh: "A" }],
    76: [{ weaponCode: 3, currentTier: "B", tierLow: "C", tierMid: "C", tierHigh: "B" }],
    77: [{ weaponCode: 24, currentTier: "B", tierLow: "B", tierMid: "B", tierHigh: "A" }],
    78: [{ weaponCode: 16, currentTier: "B", tierLow: "B", tierMid: "B", tierHigh: "A" }],
    83: [{ weaponCode: 6, currentTier: "B", tierLow: "B", tierMid: "B", tierHigh: "A" }],
    88: [{ weaponCode: 3, currentTier: "B", tierLow: "B", tierMid: "B", tierHigh: "A" }],
    89: [{ weaponCode: 9, currentTier: "B", tierLow: "C", tierMid: "C", tierHigh: "B" }],
    90: [{ weaponCode: 11, currentTier: "C", tierLow: "C", tierMid: "C", tierHigh: "C" }],
  },
};

const PATCH_TIER_FORECAST_REASONS: Record<string, Readonly<Record<string, string>>> = {
  "12.3": {
    "76:3":
      "W의 피해 감소가 50%에서 45%로 줄면 스킬 사용 중 실제로 받는 피해는 약 10% 늘어납니다. R 속박도 짧아지고 12.2 다이아+에서 서리바람 흉갑을 약 75% 선택해 장비 하향까지 겹치므로 C 티어 중심의 하락이 예상됩니다.",
    "45:4":
      "E 쿨다운이 최대 레벨 기준 14초에서 13초로 줄어 아군 보호와 재진입 기회는 늘어납니다. 다만 화력과 내구도는 그대로이고 서리바람 흉갑을 약 26% 사용해 장비 하향을 일부 받으므로 C 티어 유지가 중심으로 예상됩니다.",
    "50:21":
      "패시브 쿨다운은 3레벨에서 2초에서 3초로 늘어 얼음 지대 생성 간격이 50% 길어지고, W의 추가 체력 계수도 2%p 줄어듭니다. 필드 쏜을 약 25% 사용해 새 보호막 효과가 일부 보완할 수 있지만 핵심 빙결 주기가 느려져 B~C가 예상됩니다.",
    "13:19":
      "창 무기 숙련도 상향은 숙련도 15레벨에서 약 4.5%의 스킬 증폭 차이를 만들어 광역 스킬 전반에 적용됩니다. 다만 쇼우는 체력과 군중 제어 기여 비중도 크고 현재 C 하단이라, 지표는 오르더라도 C 유지가 중심이고 상단에서 B 진입이 예상됩니다.",
    "33:1":
      "Q를 빗맞혔을 때만 0.13초 빨리 움직일 수 있어 성공한 교전의 화력이나 제어력은 그대로입니다. 여기에 12.2 다이아+에서 약 65% 사용한 요명월의 방어력 하향도 있어 순수 상향으로 보기 어려우므로 B 티어 유지가 예상됩니다.",
    "74:3":
      "방망이 숙련도 하향은 숙련도 15레벨에서 기본 공격 증폭 약 1.5% 감소로 누적됩니다. 평타 비중과 픽률이 높은 다르코에게 꾸준히 적용되지만 스킬 수치나 생존력은 그대로이므로 A 하단에서 B로 내려가는 정도가 중심으로 예상됩니다.",
    "29:1":
      "글러브 레온은 물 위에서 오른 공격 속도로 강화 평타를 반복해 패시브 피해 감소가 교전 전체에 누적됩니다. 다만 1레벨 피해와 스킬 증폭 계수, 보호막과 군중 제어는 그대로여서 A에서 B로 한 단계 내려가는 정도가 중심으로 예상됩니다.",
    "29:2":
      "톤파 레온은 글러브보다 평타 빈도가 낮아 2·3레벨 패시브 기본 피해 5/10 감소가 누적되는 횟수도 적습니다. 보호막과 광역 군중 제어 성능은 그대로라 기본 예상은 B 유지이며, 낮은 픽률에 따른 변동 범위만 C까지 열어둡니다.",
    "10:20":
      "쌍절곤은 R을 진입과 마무리에 연결하는 비중이 높고 현재 점수가 A 경계 바로 아래라 최대 공격력 계수 15%p 상향을 받으면 A 진입 가능성이 큽니다. 궁극기 한 번에 집중된 상향이므로 S까지 오르는 예측은 과도합니다.",
    "10:1":
      "글러브도 R의 최소·최대 공격력 계수 상향으로 핵심 대상을 마무리하는 힘이 좋아집니다. 다만 평타와 Q·W가 차지하는 비중은 바뀌지 않아 B~A가 적절하며, 궁극기 상향만으로 안정적인 S 진입은 어렵다고 예상됩니다.",
    "42:24":
      "주기적으로 사용하는 패시브 강화 평타의 대상 최대 체력 피해가 5%에서 8%로 올라 해당 비중만 60% 증가합니다. 이 평타는 Q 속박 연계에도 관여하고 현재 C가 B 경계에 가까워 B 진입이 중심이며, 전열이 많은 조합에서는 A까지 가능할 것으로 예상됩니다.",
    "88:3":
      "W는 낮은 스킬 레벨의 기본 보호막과 최대 체력 계수가 함께 오르고 R의 2·3레벨 최대 체력도 증가해 진입 후 내구도가 꾸준히 좋아집니다. 다만 12.2의 상향 뒤 지표가 거의 움직이지 않았고 서리바람 흉갑 사용도 일부 있어 B 유지, 상단에서 A가 예상됩니다.",
    "28:3":
      "방망이 수아는 스킬 뒤 강화 평타로 쿨다운을 돌리는 과정에서 패시브를 계속 사용하므로 주 대상 20, 주변 피해 10 감소가 반복됩니다. 사이버 스토커도 약 66% 사용해 장비 하향이 겹치므로 A 유지보다는 B 하락이 중심으로 예상됩니다.",
    "28:13":
      "망치 수아도 스킬과 강화 평타를 반복하므로 패시브의 주 대상·범위 피해 하향을 그대로 받습니다. 방망이처럼 사이버 스토커 하향은 크게 겹치지 않지만 현재 C 하단이고 표본도 적어 중앙 예측은 D, 상단 범위는 C로 예상됩니다.",
    "35:1":
      "글러브 얀은 Q2 강화로 E 쿨다운을 초기화하며 강화 평타를 자주 연결해 대상 최대 체력 피해 1%p 상향을 반복해서 활용합니다. 현재 C가 B 경계 바로 아래라 글러브는 B 진입이 중심으로 예상됩니다.",
    "35:2":
      "톤파 얀도 E 강화 평타의 대상 최대 체력 피해가 오르지만, 톤파 운용은 글러브보다 받아치기와 군중 제어 비중이 높아 화력 상향의 환산 폭이 작습니다. 현재 평균 RP 격차도 커서 C 유지가 중심이고 상단에서만 B가 예상됩니다.",
    "11:16":
      "양손검은 무기 스킬이 방어형이라 E가 진입과 이탈을 함께 담당하며 쿨다운 1초 증가의 공백을 크게 받습니다. 서리바람 흉갑도 약 27% 사용해 추격 성능 하향이 겹치므로 S에서 A로 내려가는 예측이 중심입니다.",
    "11:18":
      "쌍검도 E의 진입·이탈 주기가 느려지지만 쌍검 무기 스킬과 연속 공격으로 E 공백을 일부 보완할 수 있고, 양손검처럼 서리바람 흉갑 하향도 크게 겹치지 않습니다. 따라서 C 하락 위험은 있으나 중앙값은 B 유지로 예상됩니다.",
    "61:5":
      "인간 상태 R 뒤 강화 평타의 스킬 증폭 계수는 5%p 오르지만 한정된 타격에만 적용됩니다. 같은 패치에서 투척 무기 스킬의 두 피해 계수와 둔화가 함께 낮아져 이렘의 원거리 교전 손실이 상향을 상쇄하므로 B 유지가 중심으로 예상됩니다.",
    "63:15":
      "성장 체력 하향은 20레벨 기준 최대 체력을 약 57 낮춥니다. 여기에 12.2 다이아+에서 소울 리퍼와 마하라자 사용이 합계 약 94%여서 단검 장비 하향이 대부분의 빌드에 겹치므로 A 유지보다 B 하락이 중심이며 C까지 열어둡니다.",
    "1:14":
      "도끼 숙련도의 공격 속도 상향은 숙련도 15레벨에서 약 6%를 보충해 느린 평타 운용에 유효하지만, 패시브 공격력 계수와 R 후반 공격 속도 하향을 완전히 메우지는 못합니다. A 경계에 있어 B가 중심이고 상단에서는 A 유지가 예상됩니다.",
    "1:15":
      "단검은 숙련도 레벨당 기본 공격 증폭과 공격 속도가 크게 줄고 패시브·R도 함께 하향됩니다. 12.2 다이아+에서 하향된 단검 네 종의 합산 선택률도 약 87%이며, 무기 스킬의 이동 속도와 둔화 하향까지 겹쳐 A에서 C가 중심이고 D까지 가능할 것으로 예상됩니다.",
    "1:18":
      "쌍검은 숙련도 15레벨 기준 공격 속도 약 6%를 추가로 얻고 연속 평타를 자주 사용해 보상 효율이 높습니다. 패시브 계수와 R 후반 공격 속도 하향이 남아 순상향으로 보기는 어렵지만 중앙 예측은 B 유지이며 C 하락 가능성만 열어둡니다.",
    "1:16":
      "양손검도 숙련도 15레벨 기준 공격 속도를 약 6% 보충받아 공통 R 하향 일부를 되돌립니다. 패시브 공격력 계수 감소는 남지만 방어형 무기 스킬과 기존 C 위치를 고려하면 급락보다는 C 유지, 상단에서 B가 예상됩니다.",
    "39:18":
      "쌍검 카밀로는 짧은 간격으로 Q를 반복하며 쌍검의 연속 공격과 연결하므로 공격력 계수 5%p 감소가 교전 전체에 누적됩니다. 현재 A 경계에 걸쳐 있어 중앙 예측은 B이며 상단에서는 A 유지가 예상됩니다.",
    "39:21":
      "레이피어도 주력 Q의 계수 하향을 반복해서 받고, 12.2 다이아+에서 약 40% 선택한 주와이외즈의 이동 속도도 3%에서 2%로 줄어 추격력이 함께 낮아집니다. 두 하향이 겹치므로 B에서 C가 중심이고 상단에서 B 유지가 예상됩니다.",
    "71:14":
      "기본 공격력 3 증가는 첫 교전부터 평타와 공격력 계수 스킬 모두에 적용되고, 전설 장비가 나오기 전 약한 구간을 직접 보완합니다. 조건 없이 전 구간에 반영되는 상향이고 현재 B가 A 경계에 가까워 A 진입이 중심으로 예상됩니다.",
    "14:21":
      "Q는 표식을 쌓고 진입을 준비할 때 반복해서 사용하는 스킬이라 스킬 증폭 계수 5%p 하향이 중후반 견제에 누적됩니다. 다만 필드 쏜의 새 보호막·이동 효과가 추격과 생존을 일부 보완할 수 있어 중앙값은 B 유지, 하단에서 C가 예상됩니다.",
    "3:21":
      "레이피어는 짧은 간격으로 스킬을 연속 적중해 패시브 회복을 자주 활용하므로 2·3레벨 회복량 10/20 상향의 효율이 높습니다. 다만 필드 쏜을 약 73%, 요명월을 약 76% 사용해 장비 변경 영향이 커서 S 상승보다는 A 유지가 중심으로 예상됩니다.",
    "3:16":
      "양손검은 방어형 무기 스킬로 버틴 뒤 교전을 이어가므로 패시브 회복 상향과 궁합이 좋습니다. 하지만 1레벨은 그대로이고 현재 C 하단에 가까우며 픽률도 낮아 중앙 예측은 C 유지, 상단에서 B가 예상됩니다.",
    "3:19":
      "창은 거리 조절 뒤 다시 진입하는 운용이라 레이피어보다 패시브 회복을 연속으로 활용하는 빈도가 낮습니다. 후반 유지력은 좋아지지만 현재 평균 RP 격차와 낮은 픽률을 뒤집기에는 부족해 C 유지, 상단에서 B가 예상됩니다.",
    "78:16":
      "W1은 교환 때 자주 사용하는 기술이지만 추가 공격력 계수 5%p 상향은 일반적인 세팅에서 보호막이 소폭 늘어나는 정도입니다. 피해량과 기동력은 그대로이므로 B 유지가 중심이며, 기존 점수가 경계에 가까워 상단에서만 A가 예상됩니다.",
    "37:15":
      "R 종료 피해의 공격력 계수 5%p 상향은 한 번의 마무리 타격에만 적용됩니다. 반면 소울 리퍼와 마하라자 선택률이 합계 약 67%이고 단검 무기 스킬의 이동·둔화도 하향되어 상향이 대부분 상쇄되므로 B 유지, 하단에서 C가 예상됩니다.",
    "18:15":
      "쇼이치는 한 번의 콤보에서 패시브 단검을 여러 차례 던져 기본 피해 10 상향을 반복해서 받습니다. 주력 단검은 이번 장비 하향 목록과 크게 겹치지 않고 무기 스킬 D2의 스킬 증폭 계수 상향도 활용할 수 있어 C 유지가 중심이지만 상단에서 B가 예상됩니다.",
    "23:18":
      "쌍검 숙련도 하향은 숙련도 15레벨에서 스킬 증폭 약 3% 감소로 모든 스킬에 적용됩니다. 사이버 스토커도 약 69% 사용해 장비 하향이 겹치지만 현재 S 상단 지표가 높아 중앙 예측은 A이며, 하단에서 B까지 예상됩니다.",
    "34:23":
      "기본 체력 25 증가는 약한 초반을 바로 보완하고, 패시브 기본 피해 10 상향은 사진을 연결할 때마다 반복됩니다. 생존과 누적 화력이 동시에 오르고 현재 A 중상단이라 A 유지부터 S 진입까지 예상됩니다.",
    "90:11":
      "E 쿨다운이 최대 레벨 기준 10초에서 9초로 줄어 생존과 거리 조절은 약 10% 자주 가능해집니다. 그러나 피해량은 그대로이고 현재 픽률은 높지만 승률과 평균 RP가 크게 낮아 한 번의 기동성 상향만으로 C를 벗어나기는 어렵다고 예상됩니다.",
    "15:5":
      "Q 상향은 윌슨의 경로를 적에게 맞혔을 때만 적용되는 조건부 5%p 계수 증가입니다. 투척은 같은 패치에서 무기 스킬 두 타격의 계수와 둔화가 함께 하향되어 상향을 상쇄하므로 B 유지가 중심이고 하단에서 C가 예상됩니다.",
    "15:6":
      "암기는 투척 무기 스킬 하향을 받지 않아 Q 경로 피해의 스킬 증폭 계수 5%p 상향을 그대로 활용합니다. 다만 정확히 경로를 맞혀야 하고 현재 C 하단이라 중앙 예측은 C 유지, 상단에서 B가 예상됩니다.",
    "52:24":
      "일반 Q와 E는 각각 5%p, W는 기본 피해와 계수가 함께 오르고 달 W도 강화됐습니다. 해 Q 계수 10%p 하향이 있지만 여러 기본 스킬의 적중 보상이 넓게 오른 쪽이 커 보여 B에서 A가 중심이며, 컨정션 운용에 따라 B 유지도 예상됩니다.",
    "66:24":
      "E 계수 5%p 상향은 일반 E뿐 아니라 R 뒤 사용하는 RE에도 적용돼 한 번의 연계에서 두 차례 이득을 볼 수 있습니다. 현재 B가 A 경계에 가까워 B~A가 예상되며, 두 스킬을 모두 맞히는 숙련 구간에서 A 진입 가능성이 큽니다.",
    "77:24":
      "W 강화 피해 계수는 10%p 오르지만 일반 W에는 적용되지 않고, 공식 설명처럼 현재 선택 빈도가 낮은 강화 형태를 골라야만 효과가 납니다. 평균적인 교전 전체에는 반영 횟수가 제한적이어서 B 유지가 중심이고 적극 활용될 때만 A가 예상됩니다.",
    "89:9":
      "주력 원거리 견제 Q의 계수가 5%p 줄고 W 쿨다운도 1초 늘어난 반면, 보상은 W 적중과 근거리 E 활용에 묶여 있습니다. 사이버 스토커도 약 71% 사용해 장비 하향이 겹치므로 높은 픽률이 내려갈 가능성까지 고려해 C가 중심이고 상단에서 B가 예상됩니다.",
    "83:6":
      "Q1 분침은 견제와 연계 시작에 자주 쓰지만 Q2 시침에는 변화가 없어 Q 전체 화력 상승폭은 제한됩니다. 스킬 증폭 계수 5%p 상향만으로 현재 B를 확실히 넘기기 어렵기 때문에 B 유지가 중심이고 상단에서 A가 예상됩니다.",
    "12:7":
      "활 숙련도 하향은 숙련도 15레벨에서 스킬 증폭 약 1.5% 감소로 모든 스킬에 적용되지만 공식 설명대로 소폭 조정입니다. 12.2 석궁 나딘 한 사례의 큰 낙폭을 그대로 대입하기 어렵고 현재 A 지표도 여유가 있어 A 유지, 하단에서 B가 예상됩니다.",
    "6:8":
      "석궁은 늑대 맹습을 교전 화력에 적극 활용하지만 줄어드는 값은 추가 공격력 계수 5%p뿐이며 기본 피해, 스킬 증폭 계수와 야성 피해는 그대로입니다. 현재 B 지표를 한 단계 내릴 정도로 크지는 않아 B 유지가 중심이고 하단에서 C가 예상됩니다.",
    "57:23":
      "방송 상태의 기본 공격은 마르티나가 취재를 마친 뒤 반복해서 사용하는 핵심 화력이라 공격력 계수 3%p 감소가 모든 사격에 누적됩니다. 단발 조정보다 실제 교전 손실이 커 B에서 C가 중심이고 상단에서 B 유지가 예상됩니다.",
    "8:22":
      "E는 세 번 나누어 사용할 수 있어 공격력 계수 5%p 상향을 모두 맞히면 한 교전에서 최대 15%p까지 누적됩니다. 현재 C가 B 경계 바로 아래라 B 진입이 중심이며, 공격적으로 세 번 모두 적중하는 경우 A까지 가능할 것으로 예상됩니다.",
    "69:9":
      "E 한 번에 피해 계수 10%p와 아군 보호막 계수 5%p가 함께 올라 공격과 보조가 동시에 좋아집니다. 다만 현재 평균 대비 RP가 약 -26으로 D 하단에 있어 단일 스킬 상향으로 C 경계를 메우기 어렵기 때문에 D 안에서의 개선이 예상됩니다.",
    "73:24":
      "W는 반복해서 사용하는 회복기라 스킬 증폭 계수 3%p 상향이 팀 전체 유지력에 누적됩니다. 그러나 피해와 생존 수치는 그대로이고 현재 평균 대비 RP가 약 -28인 D 하단이라, 지표는 개선돼도 D 티어를 벗어나기는 어렵다고 예상됩니다.",
    "51:22":
      "R의 피해 감소가 40%에서 50%로 오르면 궁극기 사용 중 실제 받는 피해는 약 16.7% 줄어 군중 제어를 끝까지 유지하기 쉬워집니다. 직접 화력 상향은 아니고 픽률도 낮아 중앙 예측은 B 유지이며, 궁극기 생존이 성과로 연결되면 A까지 예상됩니다.",
  },
};

export function getCharacterTierForecasts(
  patch: string,
  characterCode: number
): readonly PatchTierForecast[] {
  const forecasts = PATCH_TIER_FORECASTS[patch]?.[characterCode] ?? [];
  const reasons = PATCH_TIER_FORECAST_REASONS[patch] ?? {};

  return forecasts.map((forecast) => ({
    ...forecast,
    reason: reasons[`${characterCode}:${forecast.weaponCode}`] ?? "",
  }));
}
