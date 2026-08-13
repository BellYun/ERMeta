# 특성·전술 스킬·무기 스킬 사전

> 이름과 수치를 하드코딩한 공략집이 아니라, 세 시스템을 데이터에서 구별하고 패치별 성과를 연결하기 위한 사전이다.

| 항목 | 값 |
| --- | --- |
| 조사 기준일 | 2026-08-06 (KST) |
| 현재 기준 | 시즌 12 프리시즌, 패치 12.0 |
| 공식 기준 | [12.0 패치노트 Part 1](https://playeternalreturn.com/posts/news/3742), [Part 2](https://playeternalreturn.com/posts/news/3743) |
| 내부 코드 | [`traitCodes.ts`](../../../../frontend/src/utils/traitCodes.ts), [`weaponNames.ts`](../../../../frontend/const/weaponNames.ts) |
| 통계 테이블 | [`017_character_tactical_stats.sql`](../../../../backend/migrations/017_character_tactical_stats.sql) |

## 세 시스템의 경계

| 시스템 | 선택·귀속 단위 | ERMeta에서 보는 값 | 패치 민감도 |
| --- | --- | --- | --- |
| 특성 | 핵심 특성과 보조 특성 조합 | 핵심·보조 특성 코드 | 높음: 핵심/보조 전환과 수치 변경 가능 |
| 전술 스킬 | 경기에서 선택·강화하는 별도 능력 | 그룹, 최종 레벨, 사용 횟수 | 높음: 선택지·강화 효과·비용 변경 가능 |
| 무기 스킬 | 사용 무기군에 귀속된 능력 | `bestWeapon`으로 간접 연결 | 매우 높음: 12.0에서 대규모 구조 개편 |

특성, 전술 스킬과 무기 스킬은 서로 대체어가 아니다. 조합 추천이나 빌드 설명에서 각각의 코드를 별도 필드로 유지해야 한다.

## 특성

ERMeta 프런트엔드는 현재 특성을 다음 네 그룹으로 분류한다.

```text
havoc(파괴) · fortification(저항) · support(지원) · chaos(혼돈)
```

[`traitCodes.ts`](../../../../frontend/src/utils/traitCodes.ts)에는 핵심 특성과 보조 특성 슬롯별 코드 목록, 예외 코드 분류가 있다. 표시 이름은 지역화 데이터의 `Trait/Name/`을 통해 동적으로 읽는 것이 원칙이다.

### 12.0 주의사항

12.0 Part 1은 `Blast Cactus`를 보조 특성에서 핵심 특성으로, `Healing Factor`를 핵심 특성에서 보조 특성으로 옮기고 효과를 조정했다. 따라서 12.0 이전의 하드코딩된 핵심·보조 목록은 현재 정답으로 간주하지 않는다.

검증 순서는 다음과 같다.

1. 현재 공식 데이터의 특성 코드와 이름을 불러온다.
2. 핵심·보조 여부와 슬롯을 확인한다.
3. 내부 코드 목록과 diff를 낸다.
4. 누락·이동 코드를 고친 뒤 패치 번호와 검증일을 기록한다.

## 전술 스킬

수집기는 `tacticalSkillGroup`, `tacticalSkillLevel`, `tacticalSkillUseCount`를 참가자 기록에 보존한다. 집계 테이블은 다음 키로 전술 스킬별 성과를 누적한다.

```text
character + weapon + tier + patch + tactical skill group
```

저장 지표는 출전 수, 우승 수, 순위 합, RP 합이다. 따라서 특정 캐릭터·무기에서 전술 스킬 선택과 결과의 상관은 비교할 수 있지만 다음 편향을 제거하지는 못한다.

- 숙련자가 더 어려운 전술 스킬을 고르는 선택 편향
- 조합에 맞춘 선택과 솔로 큐의 우연한 조합 차이
- 전술 스킬 강화 전에 이미 승패가 기운 역인과
- 최종 레벨만 남을 때 실제 강화 시점을 알 수 없는 문제

전술 스킬 설명에는 최소한 `patch`, `groupCode`, `level`, `character`, `weapon`, `tier`, `sampleSize`를 함께 붙인다.

## 무기 스킬

ERMeta의 현재 무기 코드 사전은 다음과 같다. 이는 내부 코드 해석표이며 현재 사용 가능 여부와 세부 효과는 공식 데이터로 재검증한다.

| 코드 | 무기 | 코드 | 무기 |
| ---: | --- | ---: | --- |
| 1 | 글러브 | 13 | 망치 |
| 2 | 톤파 | 14 | 도끼 |
| 3 | 방망이 | 15 | 단검 |
| 4 | 채찍 | 16 | 양손검 |
| 5 | 투척 | 17 | 폴암 |
| 6 | 암기 | 18 | 쌍검 |
| 7 | 활 | 19 | 창 |
| 8 | 석궁 | 20 | 쌍절곤 |
| 9 | 권총 | 21 | 레이피어 |
| 10 | 돌격 소총 | 22 | 기타 |
| 11 | 저격총 | 23 | 카메라 |
|  |  | 24 | 아르카나 |
|  |  | 25 | VF의수 |

12.0 Part 2는 무기 스킬 전반을 개편했으며, 여러 실험체 스킬이 무기 스킬 적중과 상호작용하도록 바뀌었다. 단검의 은신처럼 기능 위치가 실험체 스킬로 이동한 사례도 있고, 양손검·톤파처럼 면역이 피해 감소로 바뀐 사례도 있다. 따라서 무기 스킬 지식의 기본 키는 반드시 `patch + weapon`이어야 한다.

## 저장 형식

```yaml
system_entry:
  system: "trait | tactical_skill | weapon_skill"
  code: 0
  localized_name: "현재 지역화 이름"
  patch: "12.0"
  slot_or_level: "core | sub1 | sub2 | level"
  effect_summary: "원문을 복제하지 않은 짧은 설명"
  interactions:
    characters: []
    weapons: []
    composition_roles: []
  statistics:
    tier: "DIAMOND_PLUS"
    total_games: null
    win_rate: null
    average_rp: null
  source:
    url: "공식 또는 데이터 근거"
    reviewed_at: "YYYY-MM-DD"
  status: "현재 확인 | 패치 의존 | 재검증 필요"
```

## 사용 규칙

- 코드와 표시 이름을 같은 것으로 취급하지 않는다. 이름은 지역화에 따라 달라진다.
- 12.0 이전 영상은 시스템의 목적을 설명하는 참고 자료로만 쓰고 현재 효과·수치의 근거로 쓰지 않는다.
- 승률 차이는 인과가 아니라 선택과 결과의 상관으로 표현한다.
- 전술 스킬은 최종 레벨과 사용 횟수를 분리한다.
- 무기 스킬은 실험체명만으로 묶지 않고 무기군과 패치를 포함한다.

## 출처

- [12.0 패치노트 Part 1: 특성 개편](https://playeternalreturn.com/posts/news/3742)
- [12.0 패치노트 Part 2: 무기 스킬 개편](https://playeternalreturn.com/posts/news/3743)
- [공식 개발일지: 무기 스킬 업데이트 방향](https://playeternalreturn.com/posts/news/3676)
- [1.0 시스템 소개: 전술·무기 스킬·특성의 역사적 구조](https://playeternalreturn.com/posts/news/1283?hl=pt-BR) — 현재 수치 근거로 사용하지 않음
