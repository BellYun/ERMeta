# API 데이터 캐싱 전략 가이드

> 이 문서는 ERMeta 프로젝트의 모든 API 호출에 대해
> **캐싱(Cache-Control/ISR)** vs **TS 파일 스냅샷** 중 어느 방법이 적합한지 정리한다.

---

## 판단 기준

```
데이터가 바뀌는가?
├── 예 (실시간/자주) → Cache-Control (짧은 TTL)
└── 아니오
    ├── 자동 생성 데이터 (DB 집계) → Cache-Control (긴 TTL) or TS 스냅샷
    └── 사람이 작성한 텍스트 → TS 파일
```

---

## API 별 전략

### 1. `/api/patches/history`
| 항목 | 내용 |
|------|------|
| **데이터 성격** | 패치 버전 목록 (자주 안 바뀜) |
| **변경 빈도** | 신규 패치 출시 시 (2~4주에 1번) |
| **추천** | **Cache-Control: max-age=3600** |
| **이유** | 패치가 추가될 때만 변하므로 1시간 캐시로 충분. TS 파일은 불필요 — 패치 추가될 때마다 커밋해야 함 |

---

### 2. `/api/character/stats/[characterCode]` — **현재 패치**
| 항목 | 내용 |
|------|------|
| **데이터 성격** | 현재 패치의 캐릭터 통계 (진행 중) |
| **변경 빈도** | 매일 게임 데이터 반영 |
| **추천** | **Cache-Control: max-age=1800** (30분) |
| **이유** | 실시간성이 완벽할 필요 없음. TS 파일 불가 — 데이터가 계속 바뀜 |

---

### 3. `/api/character/stats/[characterCode]` — **끝난 패치**
| 항목 | 내용 |
|------|------|
| **데이터 성격** | 종료된 패치의 확정 통계 (영구 불변) |
| **변경 빈도** | 없음 |
| **추천** | **TS 파일 스냅샷** |
| **이유** | 영원히 안 바뀌는 데이터. 클라이언트 컴포넌트(CharacterAnalysisClient)에서 직접 import 가능. DB 쿼리 제거. 패치노트와 동일한 성격 |
| **대안** | Cache-Control: max-age=86400 (24시간). 구현 단순하나 첫 요청은 DB 조회 발생 |
| **TS 파일 생성 방법** | `scripts/export-patch-stats.ts` 스크립트 실행 (패치 종료 시 1회) |

---

### 4. `/api/character/mithril-rp-ranking`
| 항목 | 내용 |
|------|------|
| **데이터 성격** | 패치+티어 기준 캐릭터 RP 랭킹 |
| **변경 빈도** | 현재 패치: 매일 / 끝난 패치: 없음 |
| **추천** | **현재 패치: Cache-Control: max-age=1800 / 끝난 패치: max-age=86400** |
| **이유** | 랭킹 페이지는 ISR로 처리 예정이므로 API 레벨 캐싱은 서버 내부 중복 방지용 |
| **TS 파일 여부** | 불필요. 랭킹은 서버에서 ISR로 pre-render됨 |

---

### 5. `/api/meta/trending`
| 항목 | 내용 |
|------|------|
| **데이터 성격** | 현재 패치 vs 이전 패치 트렌드 비교 |
| **변경 빈도** | 현재 패치 데이터가 바뀔 때마다 |
| **추천** | **Cache-Control: max-age=3600** (1시간) |
| **이유** | 두 패치 데이터 모두 필요하므로 TS 파일 조합이 복잡해짐. 캐싱으로 충분 |

---

### 6. `/api/builds/traits/main`, `/api/builds/traits/options`
| 항목 | 내용 |
|------|------|
| **데이터 성격** | 캐릭터+패치+티어 기준 특성 빌드 |
| **변경 빈도** | 현재 패치: 매일 / 끝난 패치: 없음 |
| **추천** | **현재 패치: Cache-Control: max-age=1800 / 끝난 패치: max-age=86400** |
| **이유** | 빌드 데이터는 웹 호출 구조가 복잡하고 weapon별로 분기됨. TS 파일 관리 오버헤드가 stats보다 큼 |
| **TS 파일 여부** | 고려 가능하나 weapon 분기 구조가 복잡해 권장하지 않음 |

---

### 7. `/api/stats/trios`
| 항목 | 내용 |
|------|------|
| **데이터 성격** | 캐릭터 트리오 조합 통계 |
| **변경 빈도** | 현재 패치: 매일 |
| **추천** | **Cache-Control: max-age=3600** |
| **이유** | 트리오 조합 수가 많아 TS 파일로 관리하기 부적합 (최대 86C3 = 98,770 조합) |

---

## 렌더링 컨텍스트별 캐싱 방법

| 컨텍스트 | 방법 | 예시 |
|---------|------|------|
| **Server Component (페이지)** | `export const revalidate = 3600` 또는 `fetch(..., { next: { revalidate } })` | 통계 페이지 ISR |
| **Client Component** | API 응답에 `Cache-Control` 헤더 → 브라우저 캐시 | CharacterAnalysisClient |
| **Client Component (끝난 패치)** | TS 파일 import | CharacterAnalysisClient 히스토리 차트 |
| **API Route** | `return NextResponse.json(data, { headers: { "Cache-Control": "..." } })` | 모든 API 라우트 |

---

## 최종 요약

| API | 현재 패치 | 끝난 패치 |
|-----|----------|----------|
| patches/history | max-age=3600 | — |
| character/stats | max-age=1800 | **TS 스냅샷** (CharacterAnalysisClient 전용) |
| mithril-rp-ranking | max-age=1800 | max-age=86400 (ISR 사용 시 불필요) |
| meta/trending | max-age=3600 | — |
| builds/traits | max-age=1800 | max-age=86400 |
| stats/trios | max-age=3600 | — |

---

## TS 파일 스냅샷 적용 조건 체크리스트

- [ ] 데이터가 영구적으로 변하지 않는가?
- [ ] 클라이언트 컴포넌트에서 직접 사용하는가? (Server Component면 ISR로 충분)
- [ ] 파일 크기가 관리 가능한가? (패치당 ~15KB 이하)
- [ ] 생성 스크립트를 유지할 수 있는가? (패치 종료 시 1회 실행)

→ 4가지 모두 해당 시 TS 파일 스냅샷 권장. 하나라도 해당 안 되면 Cache-Control.
