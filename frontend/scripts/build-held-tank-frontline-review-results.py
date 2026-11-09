"""Join human-written tank-frontline reviews to exact pooled evidence.

Run from the repository root. This script audits and packages reviews; it does
not write their combat interpretations.
"""

import collections
import gzip
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BASE = (
    ROOT
    / "knowledge/eternal-return/community/composition/validations"
    / "2026-10-15-s-held-tank-frontline-reviews"
)
SNAPSHOTS = ROOT / "frontend/analysis-snapshots/composition-affinity"


def read_gzip_rows(path):
    with gzip.open(path, "rt") as stream:
        for line in stream:
            yield json.loads(line)


def main():
    work = [json.loads(line) for line in (BASE / "worklist.ndjson").open()]
    work_by_key = {row["key"]: row for row in work}
    reviews = [
        line.split("|")
        for line in (BASE / "individual-reviews.tsv").read_text().splitlines()[1:]
        if line.strip()
    ]
    reviewed_keys = {row[0] for row in reviews}
    assert len(work) == len(work_by_key) == 181
    assert len(reviews) == len(reviewed_keys) == 167
    assert reviewed_keys <= work_by_key.keys()
    assert all(
        work_by_key[key]["status"]
        in {
            "individual-combat-plan-pending",
            "assistant-reviewed-combat-plan",
            "skill-checked-hypothesis",
        }
        for key in reviewed_keys
    )
    assert all(
        len(row) == 4
        and row[1] in {"P", "H"}
        and row[2].endswith(".")
        and row[3].endswith(".")
        for row in reviews
    )

    model = {
        row["key"]: row
        for row in read_gzip_rows(SNAPSHOTS / "s-reasoning-2026-10-14-model.ndjson.gz")
        if row["key"] in reviewed_keys
    }
    full = {
        row["key"]: row
        for row in read_gzip_rows(SNAPSHOTS / "s-reasoning-2026-10-14-full.ndjson.gz")
        if row["key"] in reviewed_keys
    }
    pooled = {
        row["key"]: row
        for row in read_gzip_rows(SNAPSHOTS / "pooled-all-trios-2026-10-13.ndjson.gz")
    }
    assert len(model) == len(full) == 167
    korean_source = json.loads((ROOT / "frontend/public/l10n/Korean.json").read_text())

    results = []
    for key, decision, reading, condition in reviews:
        model_row = model[key]
        full_row = full[key]
        work_row = work_by_key[key]
        assert (
            model_row["sourceSnapshot"]
            == full_row["sourceSnapshot"]
            == work_row["sourceSnapshot"]
        )
        assert model_row["skillDigest"] == full_row["skillDigest"]
        assert model_row["metrics"] == full_row["metrics"] == work_row["metrics"]
        assert len(full_row["pairContexts"]) == 3

        alternatives = []
        for full_pair, model_pair in zip(
            full_row["pairContexts"], model_row["pairContexts"]
        ):
            assert full_pair["pair"] == model_pair["pair"]
            assert full_pair["observedAlternatives"] == len(full_pair["alternatives"])
            assert full_pair["directions"] == model_pair["directions"]
            for alternative_key, direction in full_pair["alternatives"]:
                alternative = pooled[alternative_key]
                alternatives.append(
                    (alternative_key, direction, full_pair["pair"], alternative)
                )

        # Show the largest observed all-three-better replacement when possible.
        # A mixed result is a weaker counterexample and is labeled as such.
        alternative_key, direction, pair, alternative = max(
            alternatives,
            key=lambda item: (
                {"behindAllThree": 2, "mixed": 1, "aheadAllThree": 0}[item[1]],
                item[3]["games"],
                item[0],
            ),
        )
        source_keys = []
        for member in model_row["members"]:
            assert member["name"] in reading + condition, (key, member["name"])
            source_keys.extend(
                skill["sourceKey"] for skill in member["skillDescriptions"]
            )
            if member.get("weaponGuide"):
                source_keys.append(member["weaponGuide"]["sourceKey"])
        assert all(source_key in korean_source for source_key in source_keys), key

        results.append(
            {
                "key": key,
                "status": (
                    "assistant-reviewed-combat-plan"
                    if decision == "P"
                    else "skill-checked-hypothesis"
                ),
                "combatReading": reading,
                "conditionOrGap": condition,
                "sourceSnapshot": model_row["sourceSnapshot"],
                "sourceUpdatedAtKst": model_row["sourceUpdatedAtKst"],
                "skillDigest": model_row["skillDigest"],
                "skillSourceKeys": source_keys,
                "members": [
                    {
                        "member": member["member"],
                        "name": member["name"],
                        "weapon": member["weapon"],
                    }
                    for member in model_row["members"]
                ],
                "metrics": model_row["metrics"],
                "fixedPairDirections": [
                    {
                        "pair": pair_row["pair"],
                        "targetThird": pair_row["targetThird"],
                        "alternatives": pair_row["observedAlternatives"],
                        "directions": pair_row["directions"],
                    }
                    for pair_row in full_row["pairContexts"]
                ],
                "counterexample": {
                    "key": alternative_key,
                    "fixedPair": pair,
                    "direction": direction,
                    "games": alternative["games"],
                    "wins": alternative["wins"],
                    "averageRank": alternative["rankSum"] / alternative["games"],
                    "averageRP": alternative["rp"] / alternative["games"],
                },
                "uncertainty": (
                    "교전 장면·표적·사용 시점·상대 조합은 저장되지 않았으며 "
                    "통합 성적은 이 교전 가설의 원인을 입증하지 않는다."
                ),
            }
        )

    with (BASE / "individual-review-results.ndjson").open("w") as output:
        for row in sorted(results, key=lambda item: item["key"]):
            output.write(json.dumps(row, ensure_ascii=False) + "\n")

    grouped = collections.defaultdict(list)
    for row in results:
        work_row = work_by_key[row["key"]]
        tanks = [
            member
            for member in work_row["members"]
            if member["member"] in work_row["historicalTankMembers"]
        ]
        assert len(tanks) == 1
        grouped[f'{tanks[0]["name"]} {tanks[0]["weapon"]}'].append(row)

    lines = [
        "# 탱커 포함 보류 조합 167개 개별 재검토",
        "",
        "2026-10-03 18:05 KST 갱신 전체 기간 통합 집계에서 정확한 실험체·무기 조합을 검토했다. "
        "아래 문장은 저장된 한국어 스킬·무기 설명으로 가능한 **교전 가설**을 제안하거나, "
        "구체적 공백을 남긴다. 실제 경기 장면과 인과관계는 확인하지 않았다. "
        "모든 출처 키·스킬 다이제스트·세 고정쌍의 전체 교체 방향은 "
        "[근거 결과](individual-review-results.ndjson)에 있다.",
        "",
        "`완전 우위 대안`은 **이 조합보다** 승률·평균 순위·원시 팀 RP/판이 모두 좋은 "
        "동료 교체 수다. 세 고정쌍 순서대로 분자/전체 후보 수를 썼으며 판수로 후보를 삭제하지 않았다. "
        "표본과 플레이어 구성이 다르고 RP의 정의가 시즌 사이 달라 통계 차이를 "
        "스킬 연계의 원인이나 순 획득량으로 읽지 않는다.",
        "",
    ]
    for tank, entries in sorted(grouped.items(), key=lambda group: -len(group[1])):
        lines.extend([f"## {tank} ({len(entries)}개)", ""])
        for row in sorted(entries, key=lambda item: item["key"]):
            names = "·".join(
                member["name"] + " " + member["weapon"]
                for member in row["members"]
            )
            metrics = row["metrics"]
            pair_counts = "·".join(
                f'{pair["directions"]["behindAllThree"]}/{pair["alternatives"]}'
                for pair in row["fixedPairDirections"]
            )
            counter = row["counterexample"]
            status = (
                "조건부 설명 제안"
                if row["status"] == "assistant-reviewed-combat-plan"
                else "설명 보류"
            )
            lines.extend(
                [
                    f'- **{names}** (`{row["key"]}`) — {status}. '
                    f'{metrics["wins"]}/{metrics["games"]}승, 평균 순위 '
                    f'{metrics["averageRank"]:.2f}, 팀 원시 RP/판 '
                    f'{metrics["averageRP"]:.1f}. 완전 우위 대안 {pair_counts}.',
                    f'  - {row["combatReading"]} {row["conditionOrGap"]}',
                    f'  - 비교 반례: `{counter["key"]}` '
                    f'({counter["wins"]}/{counter["games"]}승, 순위 '
                    f'{counter["averageRank"]:.2f}, 원시 RP/판 '
                    f'{counter["averageRP"]:.1f}).',
                    "",
                ]
            )
    (BASE / "individual-reviews.md").write_text("\n".join(lines) + "\n")

    print("reviews", len(results))
    print("statuses", collections.Counter(row["status"] for row in results))
    print(
        "counterexample directions",
        collections.Counter(row["counterexample"]["direction"] for row in results),
    )


if __name__ == "__main__":
    main()
