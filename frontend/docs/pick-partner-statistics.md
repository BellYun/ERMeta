# 내 픽 추천용 캐릭터·무기별 파트너 통계

## 범위와 원천

`public/data/pick-partners/s10-s12-through-12.4/`에 캐릭터·무기별 JSON을 저장한다.
시즌 10·11과 시즌 12의 12.4까지 반영된 운영 추천 테이블
`v2_CharacterTrioWeaponSearch_all`의 저장된 경기만 사용한다. 시즌 전체 경기의 전수 통계라는 뜻은 아니다.
다이아몬드 이상이며, 12.5·12.6은 제외한다.

2026-10-22 운영 DB 조회에서 12.3까지의 이전본 3,109,336경기와
12.4 보정 스냅샷 445,426경기의 합계가 현재 운영 추천 집계
3,554,762경기와 일치했다. 이 범위를 고정하기 위해 추출기에서도 경기 합계를 검사한다.
다른 패치를 반영한 DB로 다시 실행하려면 범위와 검증 기준을 먼저 갱신해야 한다.

화면용 `v2_CharacterTrioWeaponMemberBucket`은 이 원천과 합계가 달라 사용하지 않는다.
12.5·12.6 추가를 위한 DB 쓰기는 이 작업에서 실행하지 않았다.

## 파일과 지표

- `manifest.json`: 범위, 생성 시각, 원천 행 수·경기 수, 파일 목록과 SHA-256.
- `{캐릭터 3자리}-{무기 2자리}.json`: 선택한 캐릭터·무기의 `baseline`과 `partners`.
- `partners[].characterCode`, `weaponCode`: 함께한 상대의 캐릭터·무기 코드.
- `totalGames`, `totalWins`: 해당 둘이 함께한 경기 수와 승리 수.
- `winRate`: `totalWins / totalGames * 100`.
- `averageRP`: 기존 추천 API와 동일하게 `totalRP / totalGames / 3`.
- `averageRank`: `rankSum / totalGames`.
- `totalRP`, `rankSum`: 파생 평균을 다시 계산할 수 있도록 남긴 원본 합계.

세 번째 캐릭터·무기 및 코어를 합쳐 집계한다. 평균끼리 단순 평균하지 않고
원본 합계를 먼저 더한다. RP와 순위는 둘이 포함된 **3인 조합의 관측 성적**이며,
개인별 RP나 상대 캐릭터만의 효과를 의미하지 않는다.
12.4 RP는 기존 운영 추천 집계의 실제 입장료 보정을 그대로 사용한다.
무기·코어별 입장료 원천이 없으므로, 기존 보정은 티어·캐릭터 3명별 입장료를 경기 수에 비례해 배분한 값이다.

상대는 상위 N개나 최소 경기 수로 자르지 않고 모두 저장한다.
UI에서 내 픽풀·표본 기준을 적용할 수 있다. 파생 평균은 소수점 4자리로 반올림한다.
캐릭터·무기 이름과 이미지는 프론트엔드의 기존 코드 매핑을 사용한다.

## 재생성 및 검증

프론트엔드 디렉터리에서 Node.js 22와 `.env`의 기존 Supabase URL·anon key로 실행한다.
운영 DB는 읽기만 한다.

```sh
node --env-file=.env scripts/export-pick-partner-stats.mjs
node --test scripts/export-pick-partner-stats.test.mjs
```

페이지를 임시 디렉터리에 캐시하며, DB 행 수·최대 ID·마지막 변경 시각이 달라지면
다른 캐시를 사용한다. 추출 전후 원천 상태를 비교하고, 행 수·경기 합계·양방향 파트너
합계 및 한 경기당 멤버 3명·상대 2명이라는 회계 조건을 확인한 뒤 JSON을 저장한다.
