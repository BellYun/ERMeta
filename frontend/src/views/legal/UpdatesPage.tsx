import type { Metadata } from "next";
import { Fragment } from "react";
import { SiteContentAd } from "@/components/ads/SiteContentAd";
import type { RouteLocale } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "업데이트 내역",
  description: "이리와지지(ER&GG) 서비스 업데이트 내역",
  robots: { index: true, follow: true },
};

interface UpdateEntry {
  date: string;
  version?: string;
  changes: string[];
}

const updates: UpdateEntry[] = [
  {
    date: "2026-10-29",
    changes: ["12.7 패치노트와 실험체별 사전 티어 전망 반영"],
  },
  {
    date: "2026-10-22",
    changes: [
      "팀원별 실험체 폭을 기반으로 3인큐 조합을 추천하는 페이지 추가",
      "아군 한 명 선택 시 무기별 파트너 성적 조회와 정렬 지원",
    ],
  },
  {
    date: "2026-10-09",
    changes: ["실험체별 과거 패치 변경 이력 전체 조회와 패치별 펼치기·접기 지원"],
  },
  {
    date: "2026-10-04",
    changes: ["내 실험체 풀을 설정하고 홈에서 해당 실험체의 패치 성적을 확인하는 개인화 기능 추가"],
  },
  {
    date: "2026-09-23",
    changes: [
      "내 실험체 풀에서 부족한 역할을 보완할 실험체를 추천하는 베타 기능 추가",
      "실험체 추천을 별도 페이지로 분리",
    ],
  },
  {
    date: "2026-09-18",
    changes: ["12.4 패치부터 RP 분석에 고정 입장료를 적용한 획득량 기준 반영"],
  },
  {
    date: "2026-09-15",
    changes: ["패치 전 예상 티어와 실제 통계 성적을 비교하는 화면 추가"],
  },
  {
    date: "2026-09-09",
    changes: [
      "홈 대시보드, 실험체·패치 분석, 순위 화면과 공통 탐색 구조 개편",
      "조합 선택과 결과 비교 화면 개선",
    ],
  },
  {
    date: "2026-08-28",
    changes: ["실험체 분석에 스킬 빌드 통계, 선마 순서 추천과 스킬 아이콘 추가"],
  },
  {
    date: "2026-08-27",
    changes: ["신규 실험체 루치아 데이터 추가 및 실험체 분석·조합 지원"],
  },
  {
    date: "2026-08-26",
    changes: ["메타 티어 점수에 픽률 반영", "패치별 순위 변동과 역할 필터 내 상대 순위 표시"],
  },
  {
    date: "2026-08-14",
    changes: ["조합 추천에 역할 구성 분석과 성공 조합 유형 비교 추가"],
  },
  {
    date: "2026-08-13",
    changes: [
      "시즌 12 통계 집계 정책 반영 및 랭크 집계 진행 상황 안내 추가",
      "조합 경향을 바탕으로 실험체 역할·유형 분석 보강",
    ],
  },
  {
    date: "2026-08-10",
    changes: ["모바일에서 실험체·무기를 연속 선택할 때 반응성 개선"],
  },
  {
    date: "2026-08-09",
    changes: ["3인 조합의 전술적 특성을 확인할 수 있는 분석 추가"],
  },
  {
    date: "2026-08-08",
    changes: ["시즌 11 리캡 페이지 추가"],
  },
  {
    date: "2026-07-16",
    changes: [
      "조합 통계와 운영 성향 정보 개선",
      "최소 표본 필터 추가 및 조합 정렬·필터의 URL 저장과 복원 개선",
    ],
  },
  {
    date: "2026-06-25",
    changes: ["신규 실험체 크레이버 데이터 추가"],
  },
  {
    date: "2026-06-04",
    changes: [
      "이전 패치 대비 지표 변화와 역할군·무기별 성적을 비교하는 패치 메타 분석 페이지 추가",
    ],
  },
  {
    date: "2026-05-31",
    changes: ["서비스 소개와 통계 집계·해석 기준을 안내하는 데이터 방법론 페이지 추가"],
  },
  {
    date: "2026-05-29",
    changes: [
      "11.3 패치 데이터 반영",
      "홈/실험체 분석 티어 필터에서 단일 미스릴 옵션 제거",
      "실험체 분석 페이지에 실험체 조합/역할 조합별 RP 추가 획득량 추가",
      "조합 실험실 상세보기와 목록 노출 범위 확장",
      "조합 정렬과 티어 산정 기준 개편",
      "조합 데이터에서 실험체/무기 조건에 맞는 후보 노출 개선",
      "조합 실험실을 무기 조합 기준으로 조회하도록 개선",
      "조합 상세보기 화면 구조와 핵심 지표 표시 개선",
      "11.1~11.3 조합 데이터를 함께 활용해 최신 실험체 조합 보강",
      "조합 실험실 일부 조건에서 500 오류가 발생하던 문제 수정",
      "메인/실험실 화면의 상태 표시와 불필요한 설명 문구 정리",
    ],
  },
  {
    date: "2026-05-26",
    changes: ["티어 필터의 단일/누적(+) 옵션 충돌 수정"],
  },
  {
    date: "2026-05-24",
    changes: [
      "실험체 유형 분석 페이지 추가",
      "조합 실험실 페이지 추가",
      "실험체 빌드 통계를 누적(+) 티어 기준으로 통일",
      "실험체 분석에 1000위권 필터 추가",
      "티어 선택 의미를 누적(+) 기준으로 정리",
    ],
  },
  {
    date: "2026-05-21",
    changes: [
      "트리오/통계 데이터 로딩 안정성 개선",
      "광고 영역 추가",
      "개인정보처리방침에 Google AdSense 쿠키 섹션 추가",
    ],
  },
  {
    date: "2026-05-19",
    changes: [
      "패치 버전 하드코딩 제거 및 최신 패치노트 자동 사용",
      "11.2 패치노트 데이터 추가",
      "신규 실험체 비형 데이터와 다국어 리소스 추가",
      "알렉스 통계를 무기군 무관 단일 직업군 기준으로 통합",
      "홈/랭킹/실험체 통계 로딩 속도 개선",
    ],
  },
  {
    date: "2026-05-08",
    changes: [
      "11.1 통계 제공",
      "통계 계산에서 11.0 패치 제외",
      "기본 티어 기준을 다이아몬드로 통일",
      "미스릴 컷 상향",
    ],
  },
  {
    date: "2026-05-07",
    changes: ["페어 시너지 기능 추가", "신규 아이템 및 패치노트 데이터 업데이트"],
  },
  {
    date: "2026-05-03",
    changes: ["조합 데이터 정확도 개선", "소표본 기준을 20판으로 상향"],
  },
  {
    date: "2026-05-02",
    changes: ["다국어 페이지 안정성 개선", "실험체 상세 페이지 로딩 안정성 개선"],
  },
  {
    date: "2026-04-30",
    changes: [
      "시즌 리캡 기능 추가",
      "패치노트 기능 추가",
      "URL 우선 locale 라우팅과 언어 안내 배너 적용",
      "공유 링크와 언어별 메타데이터 표시 개선",
      "프리시즌/구버전 지표 노출 정리",
    ],
  },
  {
    date: "2026-04-28",
    changes: [
      "홈/랭킹/시너지 주요 화면 리디자인",
      "홈 필터 URL 동기화",
      "랭킹 모바일 탭 단순화",
      "피드백 보내기 기능 토글화",
    ],
  },
  {
    date: "2026-04-21",
    changes: ["공유 링크 기능 개선", "공유 미리보기 이미지 생성 기능 추가"],
  },
  {
    date: "2026-04-19",
    changes: ["접근성 개선", "일부 화면의 색상 대비와 키보드 접근성 개선"],
  },
  {
    date: "2026-04-16",
    changes: ["10.7 버전 데이터 추가"],
  },
  {
    date: "2026-04-15",
    changes: ["조합 상세 페이지 터치/스크롤 충돌 개선", "iOS Safari 탭 지연 대응"],
  },
  {
    date: "2026-04-14",
    changes: ["티어 세그먼트 접근성 구조 개선", "포커스 트랩과 키보드 네비게이션 보강"],
  },
  {
    date: "2026-04-13",
    changes: [
      "상세 조합 페이지 성능 개선",
      "모바일 터치 반응성 개선",
      "조합 카드 점진 렌더링 및 불필요한 재렌더 차단",
    ],
  },
  {
    date: "2026-04-12",
    changes: ["메인페이지 로딩 속도 개선", "상승 실험체 소표본 제거", "움직임 줄이기 설정 대응"],
  },
  {
    date: "2026-04-04",
    changes: ["실험체 분석 UI 개선", "실험체 분석 진입 흐름 개선"],
  },
  {
    date: "2026-04-02",
    changes: [
      "실험체 분석/조합 데이터 플로우 다국어화",
      "홈 대시보드와 랭킹 UI 다국어화",
      "언어 전환 및 전역 메타데이터 연결",
    ],
  },
  {
    date: "2026-03-30",
    changes: [
      "실험체 분석 페이지 초기 로딩 성능 개선",
      "나머지 패치 데이터 fetch 지연 로딩",
      "차트 번들 크기 조정",
    ],
  },
  {
    date: "2026-03-29",
    changes: ["실험체 분석 페이지 로딩 속도와 오류 화면 안정성 개선"],
  },
  {
    date: "2026-03-27",
    changes: ["메인 페이지 리디자인", "모바일/가로 스크롤 UI 개선"],
  },
  {
    date: "2026-03-25",
    changes: [
      "시너지 페이지 레이아웃 개선 (아군 선택/조합 결과 좌우 배치)",
      "상세 조합 페이지 레이아웃 개선",
      "상세 조합 특성 브레이크다운 UI 개선 (특성 아이콘 추가, 클릭으로 펼치기)",
      "로딩 스켈레톤 UI 개선",
      "더보기 버튼 추가 (30개 단위 로드)",
    ],
  },
  {
    date: "2026-03-19",
    changes: ["무기군별 상세 조합 분석 페이지 추가"],
  },
  {
    date: "2026-03-15",
    changes: ["초성 검색 시 띄어쓰기 무시하도록 개선"],
  },
  {
    date: "2026-03-14",
    changes: ["모바일 반응형 UI 개선"],
  },
  {
    date: "2026-03-12",
    changes: [
      "도메인 변경: erwagg.com",
      "브랜딩 변경: LumiaStats → 이리와지지(ER&GG)",
      "SEO 메타데이터 및 파비콘 업데이트",
      "이용약관 / 개인정보처리방침 페이지 추가",
    ],
  },
  {
    date: "2026-03-10",
    changes: [
      "실험체 분석 페이지 추가 (장비/특성 빌드, 스킬 빌드)",
      "상승 실험체 섹션 추가",
      "3인 조합(시너지) 데이터 페이지 추가",
    ],
  },
  {
    date: "2026-03-09",
    changes: ["서비스 오픈", "실험체 티어 랭킹 (승률/픽률/평균 RP)", "패치별 필터 및 티어 필터"],
  },
];

const localizedUpdates: Record<
  Exclude<RouteLocale, "ko">,
  { title: string; intro: string; entries: UpdateEntry[] }
> = {
  en: {
    title: "Updates",
    intro: "Recent ER&GG service changes.",
    entries: [
      {
        date: "2026-10-29",
        changes: ["Added patch 12.7 notes and pre-patch character tier forecasts"],
      },
      {
        date: "2026-10-22",
        changes: [
          "Added trio team recommendations based on each teammate’s character pool",
          "Select one ally to compare and sort partner statistics by weapon",
        ],
      },
      {
        date: "2026-10-09",
        changes: ["Added full character patch history with expandable patch entries"],
      },
      {
        date: "2026-10-04",
        changes: ["Added personalized home statistics for characters in your saved pool"],
      },
      {
        date: "2026-09-23",
        changes: [
          "Launched beta recommendations for characters that fill gaps in your pool",
          "Moved character recommendations to a dedicated page",
        ],
      },
      {
        date: "2026-09-18",
        changes: [
          "Updated RP analysis from patch 12.4 onward to use gains adjusted for a fixed entry cost",
        ],
      },
      {
        date: "2026-09-15",
        changes: [
          "Added a comparison of pre-patch tier forecasts and actual statistical performance",
        ],
      },
      {
        date: "2026-09-09",
        changes: [
          "Redesigned the home dashboard, character and patch analysis, rankings, and site navigation",
          "Improved team selection and result comparison",
        ],
      },
      {
        date: "2026-08-28",
        changes: [
          "Added skill build statistics, skill upgrade priorities, and skill icons to character analysis",
        ],
      },
      {
        date: "2026-08-27",
        changes: ["Added Lucia data and support in character and team analysis"],
      },
      {
        date: "2026-08-26",
        changes: [
          "Updated meta tier scores to account for pick rate",
          "Added patch-to-patch ranking changes and rankings within role filters",
        ],
      },
      {
        date: "2026-08-14",
        changes: [
          "Added role composition analysis and comparisons with successful team archetypes",
        ],
      },
      {
        date: "2026-08-13",
        changes: [
          "Applied season 12 statistics collection rules and added ranked collection progress notices",
          "Expanded character role and type analysis based on team composition trends",
        ],
      },
      {
        date: "2026-08-10",
        changes: [
          "Improved responsiveness when selecting characters and weapons in quick succession on mobile",
        ],
      },
      {
        date: "2026-08-09",
        changes: ["Added analysis of tactical characteristics for three-character teams"],
      },
      {
        date: "2026-08-08",
        changes: ["Added the season 11 recap page"],
      },
      {
        date: "2026-07-16",
        changes: [
          "Improved team statistics and playstyle insights",
          "Added a minimum sample filter and improved URL saving and restoration of team filters and sorting",
        ],
      },
      {
        date: "2026-06-25",
        changes: ["Added data for the new character Craver"],
      },
      {
        date: "2026-06-04",
        changes: [
          "Added patch meta analysis with changes from the previous patch and comparisons by role and weapon",
        ],
      },
      {
        date: "2026-05-31",
        changes: [
          "Added service information and a data methodology page explaining statistics collection and interpretation",
        ],
      },
      {
        date: "2026-05-29",
        changes: [
          "Patch 11.3 data added",
          "Character analysis now includes role-combo RP movement",
          "Team Lab coverage and detail views expanded",
          "Team sorting and tier rules adjusted",
          "Unnecessary status and helper labels cleaned up",
        ],
      },
      {
        date: "2026-05-24",
        changes: [
          "Character type analysis page added",
          "Team Lab page added",
          "Character build statistics standardized to cumulative tier filters",
        ],
      },
      {
        date: "2026-04-30",
        changes: [
          "Season recap and patch note pages added",
          "Locale routing and language notice applied",
          "Old and preseason metric exposure cleaned up",
        ],
      },
      {
        date: "2026-03-25",
        changes: [
          "Team data layout improved",
          "Detailed team trait breakdown added",
          "Loading states and mobile scrolling refined",
        ],
      },
      {
        date: "2026-03-10",
        changes: [
          "Character analysis page added",
          "Rising character section added",
          "Three-character team data page added",
        ],
      },
    ],
  },
  ja: {
    title: "更新履歴",
    intro: "ER&GG の主なサービス変更です。",
    entries: [
      {
        date: "2026-10-29",
        changes: ["パッチ12.7のノートとキャラクター別の事前ティア予測を追加"],
      },
      {
        date: "2026-10-22",
        changes: [
          "チームメンバーの持ちキャラクターをもとに3人編成を提案するページを追加",
          "味方を1人選択すると、武器別のパートナー成績を比較・ソートできるように改善",
        ],
      },
      {
        date: "2026-10-09",
        changes: [
          "キャラクターの過去のパッチ変更履歴をすべて確認でき、パッチごとに開閉できるように改善",
        ],
      },
      {
        date: "2026-10-04",
        changes: [
          "持ちキャラクターを設定し、ホームでそのキャラクターのパッチ成績を確認できる機能を追加",
        ],
      },
      {
        date: "2026-09-23",
        changes: [
          "持ちキャラクターに不足する役割を補うキャラクター推薦機能をベータ公開",
          "キャラクター推薦を専用ページに分離",
        ],
      },
      {
        date: "2026-09-18",
        changes: ["パッチ12.4以降のRP分析を、固定入場料を適用した獲得量基準に変更"],
      },
      {
        date: "2026-09-15",
        changes: ["パッチ前の予想ティアと実際の統計成績を比較する画面を追加"],
      },
      {
        date: "2026-09-09",
        changes: [
          "ホーム、キャラクター・パッチ分析、ランキング画面と共通ナビゲーションを刷新",
          "編成選択と結果比較の画面を改善",
        ],
      },
      {
        date: "2026-08-28",
        changes: ["キャラクター分析にスキルビルド統計、スキル強化優先順位とスキルアイコンを追加"],
      },
      {
        date: "2026-08-27",
        changes: ["新キャラクター「ルチア」のデータを追加し、キャラクター分析と編成に対応"],
      },
      {
        date: "2026-08-26",
        changes: [
          "メタのティアスコアにピック率を反映",
          "パッチ間の順位変動と役割フィルター内の相対順位を表示",
        ],
      },
      {
        date: "2026-08-14",
        changes: ["編成推薦に役割構成の分析と好成績の編成タイプとの比較を追加"],
      },
      {
        date: "2026-08-13",
        changes: [
          "シーズン12の統計集計方針を反映し、ランク集計の進捗案内を追加",
          "編成傾向をもとにキャラクターの役割・タイプ分析を強化",
        ],
      },
      {
        date: "2026-08-10",
        changes: ["モバイルでキャラクターや武器を連続選択する際の応答性を改善"],
      },
      {
        date: "2026-08-09",
        changes: ["3人編成の戦術的な特徴を確認できる分析を追加"],
      },
      {
        date: "2026-08-08",
        changes: ["シーズン11のリキャップページを追加"],
      },
      {
        date: "2026-07-16",
        changes: [
          "編成統計と立ち回り傾向の情報を改善",
          "最小サンプル数フィルターを追加し、URLによる編成フィルター・ソートの保存と復元を改善",
        ],
      },
      {
        date: "2026-06-25",
        changes: ["新キャラクター「クレイヴァー」のデータを追加"],
      },
      {
        date: "2026-06-04",
        changes: ["前パッチからの指標変化と役割・武器別の成績を比較するパッチメタ分析ページを追加"],
      },
      {
        date: "2026-05-31",
        changes: ["サービス紹介と統計の集計・解釈基準を案内するデータ方法論ページを追加"],
      },
      {
        date: "2026-05-29",
        changes: [
          "パッチ11.3データを反映",
          "キャラクター分析に役割編成別RP変化を追加",
          "編成ラボの表示範囲と詳細画面を拡張",
          "編成ソートとティア算出基準を調整",
          "不要な状態表示と説明文を整理",
        ],
      },
      {
        date: "2026-05-24",
        changes: [
          "キャラクタータイプ分析ページを追加",
          "編成ラボページを追加",
          "キャラクタービルド統計を累積ティア基準に統一",
        ],
      },
      {
        date: "2026-04-30",
        changes: [
          "シーズンリキャップとパッチノートページを追加",
          "URL基準の言語ルーティングと案内を適用",
          "旧バージョンとプレシーズン指標の表示を整理",
        ],
      },
      {
        date: "2026-03-25",
        changes: [
          "編成データ画面のレイアウトを改善",
          "詳細編成の特性内訳を追加",
          "ローディング状態とモバイルスクロールを調整",
        ],
      },
      {
        date: "2026-03-10",
        changes: [
          "キャラクター分析ページを追加",
          "上昇キャラクターセクションを追加",
          "3人編成データページを追加",
        ],
      },
    ],
  },
  "zh-Hans": {
    title: "更新记录",
    intro: "ER&GG 近期服务变更。",
    entries: [
      {
        date: "2026-10-29",
        changes: ["加入 12.7 版本说明与角色梯度预测"],
      },
      {
        date: "2026-10-22",
        changes: [
          "新增根据各队友角色池推荐三人阵容的页面",
          "选择一名队友后，可查看并排序不同武器搭档的成绩",
        ],
      },
      {
        date: "2026-10-09",
        changes: ["支持查看角色的完整历史版本改动，并按版本展开或收起"],
      },
      {
        date: "2026-10-04",
        changes: ["新增首页个性化功能，可设置自己的角色池并查看对应角色的版本成绩"],
      },
      {
        date: "2026-09-23",
        changes: ["推出角色推荐测试版，推荐可补足角色池定位短板的角色", "将角色推荐移至独立页面"],
      },
      {
        date: "2026-09-18",
        changes: ["自 12.4 版本起，RP 分析采用计入固定入场费用后的收益标准"],
      },
      {
        date: "2026-09-15",
        changes: ["新增版本更新前的梯度预测与实际统计成绩对比页面"],
      },
      {
        date: "2026-09-09",
        changes: ["改版首页、角色与版本分析、排行榜及全站导航", "改进阵容选择与结果对比界面"],
      },
      {
        date: "2026-08-28",
        changes: ["角色分析新增技能加点统计、优先升满顺序推荐及技能图标"],
      },
      {
        date: "2026-08-27",
        changes: ["新增角色露西娅数据，并支持角色与阵容分析"],
      },
      {
        date: "2026-08-26",
        changes: ["将选取率纳入版本梯度评分", "显示版本间排名变化及定位筛选范围内的相对排名"],
      },
      {
        date: "2026-08-14",
        changes: ["阵容推荐新增定位构成分析与高表现阵容类型对比"],
      },
      {
        date: "2026-08-13",
        changes: [
          "应用第 12 赛季统计规则，并新增排位数据收集进度提示",
          "根据阵容趋势完善角色定位与类型分析",
        ],
      },
      {
        date: "2026-08-10",
        changes: ["改善移动端连续选择角色与武器时的响应速度"],
      },
      {
        date: "2026-08-09",
        changes: ["新增三人阵容战术特点分析"],
      },
      {
        date: "2026-08-08",
        changes: ["新增第 11 赛季回顾页面"],
      },
      {
        date: "2026-07-16",
        changes: [
          "改进阵容统计与运营风格信息",
          "新增最小样本筛选，并改进阵容筛选与排序条件的 URL 保存和恢复",
        ],
      },
      {
        date: "2026-06-25",
        changes: ["新增角色克雷弗数据"],
      },
      {
        date: "2026-06-04",
        changes: ["新增版本环境分析页面，对比上一版本的指标变化及不同定位、武器的表现"],
      },
      {
        date: "2026-05-31",
        changes: ["新增服务介绍与数据方法说明页面，介绍统计收集和解读标准"],
      },
      {
        date: "2026-05-29",
        changes: [
          "加入 11.3 版本数据",
          "角色分析新增角色定位组合 RP 变化",
          "扩展阵容实验室覆盖范围和详情页",
          "调整阵容排序和梯度计算规则",
          "整理不必要的状态标记和说明文案",
        ],
      },
      {
        date: "2026-05-24",
        changes: ["新增角色类型分析页面", "新增阵容实验室页面", "角色出装统计统一为累计段位筛选"],
      },
      {
        date: "2026-04-30",
        changes: [
          "新增赛季回顾和版本说明页面",
          "应用基于 URL 的语言路由和语言提示",
          "整理旧版本和季前赛指标显示",
        ],
      },
      {
        date: "2026-03-25",
        changes: ["改进阵容数据页面布局", "新增详细阵容特性拆解", "调整加载状态和移动端滚动体验"],
      },
      {
        date: "2026-03-10",
        changes: ["新增角色分析页面", "新增上升角色区块", "新增三人阵容数据页面"],
      },
    ],
  },
  "zh-Hant": {
    title: "更新紀錄",
    intro: "ER&GG 近期服務變更。",
    entries: [
      {
        date: "2026-10-29",
        changes: ["加入 12.7 版本說明與角色梯度預測"],
      },
      {
        date: "2026-10-22",
        changes: [
          "新增根據各隊友角色池推薦三人陣容的頁面",
          "選擇一名隊友後，可查看並排序不同武器搭檔的成績",
        ],
      },
      {
        date: "2026-10-09",
        changes: ["支援查看角色的完整歷史版本改動，並按版本展開或收合"],
      },
      {
        date: "2026-10-04",
        changes: ["新增首頁個人化功能，可設定自己的角色池並查看對應角色的版本成績"],
      },
      {
        date: "2026-09-23",
        changes: ["推出角色推薦測試版，推薦可補足角色池定位短板的角色", "將角色推薦移至獨立頁面"],
      },
      {
        date: "2026-09-18",
        changes: ["自 12.4 版本起，RP 分析採用計入固定入場費用後的收益標準"],
      },
      {
        date: "2026-09-15",
        changes: ["新增版本更新前的梯度預測與實際統計成績對比頁面"],
      },
      {
        date: "2026-09-09",
        changes: ["改版首頁、角色與版本分析、排行榜及全站導覽", "改進陣容選擇與結果對比介面"],
      },
      {
        date: "2026-08-28",
        changes: ["角色分析新增技能配點統計、優先升滿順序推薦及技能圖示"],
      },
      {
        date: "2026-08-27",
        changes: ["新增角色露西婭資料，並支援角色與陣容分析"],
      },
      {
        date: "2026-08-26",
        changes: ["將選取率納入版本梯度評分", "顯示版本間排名變化及定位篩選範圍內的相對排名"],
      },
      {
        date: "2026-08-14",
        changes: ["陣容推薦新增定位構成分析與高表現陣容類型對比"],
      },
      {
        date: "2026-08-13",
        changes: [
          "套用第 12 賽季統計規則，並新增牌位資料收集進度提示",
          "根據陣容趨勢完善角色定位與類型分析",
        ],
      },
      {
        date: "2026-08-10",
        changes: ["改善行動端連續選擇角色與武器時的回應速度"],
      },
      {
        date: "2026-08-09",
        changes: ["新增三人陣容戰術特點分析"],
      },
      {
        date: "2026-08-08",
        changes: ["新增第 11 賽季回顧頁面"],
      },
      {
        date: "2026-07-16",
        changes: [
          "改進陣容統計與營運風格資訊",
          "新增最小樣本篩選，並改進陣容篩選與排序條件的 URL 儲存和還原",
        ],
      },
      {
        date: "2026-06-25",
        changes: ["新增角色克雷弗資料"],
      },
      {
        date: "2026-06-04",
        changes: ["新增版本環境分析頁面，對比上一版本的指標變化及不同定位、武器的表現"],
      },
      {
        date: "2026-05-31",
        changes: ["新增服務介紹與資料方法說明頁面，介紹統計收集和解讀標準"],
      },
      {
        date: "2026-05-29",
        changes: [
          "加入 11.3 版本資料",
          "角色分析新增角色定位組合 RP 變化",
          "擴展陣容實驗室覆蓋範圍和詳情頁",
          "調整陣容排序和梯度計算規則",
          "整理不必要的狀態標記和說明文案",
        ],
      },
      {
        date: "2026-05-24",
        changes: ["新增角色類型分析頁面", "新增陣容實驗室頁面", "角色出裝統計統一為累計牌位篩選"],
      },
      {
        date: "2026-04-30",
        changes: [
          "新增賽季回顧和版本說明頁面",
          "套用基於 URL 的語言路由和語言提示",
          "整理舊版本和季前賽指標顯示",
        ],
      },
      {
        date: "2026-03-25",
        changes: ["改進陣容資料頁面版面", "新增詳細陣容特性拆解", "調整載入狀態和行動端捲動體驗"],
      },
      {
        date: "2026-03-10",
        changes: ["新增角色分析頁面", "新增上升角色區塊", "新增三人陣容資料頁面"],
      },
    ],
  },
};

export default function UpdatesPage({ locale = "ko" }: { locale?: RouteLocale }) {
  const localized = locale === "ko" ? null : localizedUpdates[locale];
  const title = localized?.title ?? "업데이트 내역";
  const intro = localized?.intro ?? "이리와지지(ER&GG) 서비스 변경 사항을 안내합니다.";
  const entries = localized?.entries ?? updates;

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-5 py-8">
      <header className="dashboard-panel p-4">
        <span className="dashboard-kicker">{intro}</span>
        <h1 className="dashboard-section-title mt-2 text-xl font-bold text-[var(--color-foreground)]">
          {title}
        </h1>
      </header>

      <div className="grid gap-3">
        {entries.map((entry, index) => (
          <Fragment key={entry.date}>
            <section
              className="metric-card p-4"
              data-accent={entry === entries[0] ? "true" : undefined}
            >
              <div className="mb-3 flex items-center gap-3">
                <time className="text-sm font-semibold text-[var(--color-accent-foreground)]">
                  {entry.date}
                </time>
                {entry.version && (
                  <span className="rounded border border-[var(--color-accent)] bg-[var(--color-accent-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent-foreground)]">
                    {entry.version}
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {entry.changes.map((change, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded bg-[var(--color-accent)]" />
                    {change}
                  </li>
                ))}
              </ul>
            </section>
            {index === 1 ? <SiteContentAd /> : null}
          </Fragment>
        ))}
      </div>
    </article>
  );
}
