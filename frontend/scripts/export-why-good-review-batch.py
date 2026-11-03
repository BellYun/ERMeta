"""Export bounded, evidence-backed packets for reason-first composition review.

Run from the repository root:
  python3 frontend/scripts/export-why-good-review-batch.py --limit 20 --output /tmp/why-good-batch.ndjson
  python3 frontend/scripts/export-why-good-review-batch.py --full-fight-pending --limit 20 --output /tmp/full-fight-pending.ndjson

The full-fight-pending mode includes older reason-first drafts not yet reviewed
against all three fixed-pair contexts. This script prepares review inputs. It
never publishes or invents explanations.
"""

import argparse
import gzip
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
FRONTEND = ROOT / "frontend"
NARRATIVE_PATH = FRONTEND / "data/composition-explanations/narratives.v2.json"
REASON_PATH = FRONTEND / "data/composition-explanations/why-good.v1.json"
PACKET_PATH = FRONTEND / "analysis-snapshots/composition-affinity/s-reasoning-2026-10-14-full.ndjson.gz"


def load_json(path: Path):
    return json.loads(path.read_text())


def review_queue(include_held: bool, full_fight_pending: bool):
    source = load_json(NARRATIVE_PATH)
    narratives = {row["key"]: row for row in source["narratives"]}
    if full_fight_pending:
        completed = set()
        for path in sorted(REASON_PATH.parent.glob("full-fight-reviewed-*.json")):
            batch = load_json(path)
            assert batch["sourceSnapshot"] == source["sourceSnapshot"], path
            completed.update(batch["keys"])
    else:
        completed = {row["key"] for row in load_json(REASON_PATH)["reasons"]}
    candidates = []
    pooled_by_key = {}
    with gzip.open(FRONTEND / source["sourceSnapshot"], "rt") as stream:
        for line in stream:
            pooled = json.loads(line)
            key = pooled["key"]
            pooled_by_key[key] = pooled
            if not pooled["uiS"] or key in completed:
                continue
            narrative = narratives.get(key)
            if narrative and narrative["reviewStatus"] == "user-reviewed":
                continue
            if not narrative and not include_held and not full_fight_pending:
                continue
            candidates.append((key, pooled["games"]))
    candidates.sort(key=lambda item: (-item[1], item[0]))
    return candidates, narratives, pooled_by_key


def compact_packet(packet: dict, narrative: dict | None, pooled_by_key: dict):
    members = []
    for member in packet["members"]:
        members.append(
            {
                "member": member["member"],
                "name": member["name"],
                "weapon": member["weapon"],
                "historicalType": member["historicalType"],
                "skillDescriptions": member["skillDescriptions"],
                "weaponGuide": member.get("weaponGuide"),
            }
        )

    return {
        "key": packet["key"],
        "sourceSnapshot": packet["sourceSnapshot"],
        "sourceUpdatedAtKst": packet["sourceUpdatedAtKst"],
        "metrics": packet["metrics"],
        "members": members,
        "pairContexts": [
            {
                "pair": context["pair"],
                "targetThird": context["targetThird"],
                "observedAlternatives": context["observedAlternatives"],
                "directions": context["directions"],
                "selectedAlternatives": context["selectedAlternatives"],
                "allAlternatives": [
                    {
                        "key": key,
                        "games": pooled_by_key[key]["games"],
                        "wins": pooled_by_key[key]["wins"],
                        "averageRank": pooled_by_key[key]["rankSum"] / pooled_by_key[key]["games"],
                        "averageRP": pooled_by_key[key]["rp"] / pooled_by_key[key]["games"],
                        "direction": direction,
                    }
                    for key, direction in context["alternatives"]
                ],
            }
            for context in packet["pairContexts"]
        ],
        "existingDraft": (
            {
                "paragraph": narrative["paragraph"],
                "thesis": narrative["thesis"],
                "skillSourceKeys": narrative["evidence"]["skillSourceKeys"],
                "samePairComparisons": narrative["evidence"]["samePairComparisons"],
                "unobserved": narrative["unobserved"],
            }
            if narrative
            else None
        ),
        "reviewInstruction": (
            "세 명의 교전 전 견제, 이니시·받아치기, 1선·CC, 주력딜·서브딜을 먼저 판단하라. "
            "같은 두 명을 고정하고 동료를 바꿨을 때 팀 전체의 역할 배치가 어떻게 달라지는지 설명하라. "
            "스킬 하나의 조건부 피해만으로 조합 전체의 강점을 대신하지 말라. "
            "전체 기간 통합 성적은 관찰이며 스킬 시너지의 인과 증거가 아니다. "
            "세 고정쌍의 대안과 스킬 원문을 대조하고 설명할 수 없으면 held로 둔다."
        ),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--include-held", action="store_true")
    parser.add_argument(
        "--full-fight-pending",
        action="store_true",
        help="Include older reason-first drafts that still need full tactical review",
    )
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.offset < 0 or args.limit < 1:
        parser.error("--offset must be >= 0 and --limit must be >= 1")

    candidates, narratives, pooled_by_key = review_queue(
        args.include_held, args.full_fight_pending
    )
    selected = candidates[args.offset : args.offset + args.limit]
    selected_keys = {key for key, _ in selected}
    packets = {}
    with gzip.open(PACKET_PATH, "rt") as stream:
        for line in stream:
            packet = json.loads(line)
            if packet["key"] in selected_keys:
                packets[packet["key"]] = packet

    missing = selected_keys - packets.keys()
    if missing:
        raise ValueError(f"Missing source packets: {sorted(missing)}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w") as stream:
        for key, _ in selected:
            stream.write(
                json.dumps(
                    compact_packet(packets[key], narratives.get(key), pooled_by_key),
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
                + "\n"
            )
    print(
        f"Exported {len(selected)} packets from {len(candidates)} pending S compositions "
        f"(offset {args.offset}) to {args.output}"
    )


if __name__ == "__main__":
    main()
