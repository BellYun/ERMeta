"""List every displayed S trio and its reason-first review state.

Run from the repository root:
  python3 frontend/scripts/build-why-good-review-inventory.py 2026-10-22

This is a worklist, not a generator of tactical conclusions.
"""

import argparse
import gzip
import json
from collections import Counter
from pathlib import Path


FRONTEND = Path(__file__).resolve().parents[1]
NARRATIVES = FRONTEND / "data/composition-explanations/narratives.v2.json"
REASONS = FRONTEND / "data/composition-explanations/why-good.v1.json"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("date", help="Output date in YYYY-MM-DD format")
    args = parser.parse_args()
    if len(args.date) != 10 or args.date[4] != "-" or args.date[7] != "-":
        parser.error("date must be YYYY-MM-DD")

    narratives = json.loads(NARRATIVES.read_text())
    reasons = json.loads(REASONS.read_text())
    assert narratives["sourceSnapshot"] == reasons["sourceSnapshot"]
    assert narratives["sourceUpdatedAtKst"] == reasons["sourceUpdatedAtKst"]
    narrative_by_key = {row["key"]: row for row in narratives["narratives"]}
    reason_by_key = {row["key"]: row for row in reasons["reasons"]}
    assert len(narrative_by_key) == len(narratives["narratives"])
    assert len(reason_by_key) == len(reasons["reasons"])
    full_fight_keys = set()
    for path in sorted(REASONS.parent.glob("full-fight-reviewed-*.json")):
        batch = json.loads(path.read_text())
        assert batch["sourceSnapshot"] == narratives["sourceSnapshot"]
        assert batch["reviewStatus"] == "assistant-proposed"
        assert len(batch["keys"]) == len(set(batch["keys"])), path
        assert set(batch["keys"]).issubset(reason_by_key), path
        full_fight_keys.update(batch["keys"])

    rows = []
    with gzip.open(FRONTEND / narratives["sourceSnapshot"], "rt") as stream:
        for line in stream:
            pooled = json.loads(line)
            if not pooled["uiS"]:
                continue
            key = pooled["key"]
            old = narrative_by_key.get(key)
            current = reason_by_key.get(key)
            state = (
                "full-fight-proposed"
                if key in full_fight_keys
                else "legacy-reason-first"
                if current
                else "user-reviewed-old-draft"
                if old and old["reviewStatus"] == "user-reviewed"
                else "old-draft"
                if old
                else "no-draft"
            )
            rows.append(
                {
                    "key": key,
                    "state": state,
                    "games": pooled["games"],
                    "wins": pooled["wins"],
                    "averageRank": pooled["rankSum"] / pooled["games"],
                    "averageRawTeamRP": pooled["rp"] / pooled["games"],
                }
            )

    assert len(rows) == 11015, f"S source count changed: {len(rows)}"
    rows.sort(key=lambda row: (-row["games"], row["key"]))
    counts = Counter(row["state"] for row in rows)
    pending = [row for row in rows if row["state"] != "full-fight-proposed"]
    prefix = FRONTEND / f"analysis-snapshots/composition-affinity/why-good-review-inventory-{args.date}"
    with gzip.open(str(prefix) + ".ndjson.gz", "wt") as stream:
        for row in rows:
            stream.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
    summary = {
        "sourceSnapshot": narratives["sourceSnapshot"],
        "sourceUpdatedAtKst": narratives["sourceUpdatedAtKst"],
        "displayedS": len(rows),
        "states": dict(sorted(counts.items())),
        "fullFightReviewedS": counts["full-fight-proposed"],
        "reasonFirstS": counts["full-fight-proposed"] + counts["legacy-reason-first"],
        "pendingFullFightReview": len(pending),
        "reasonTotalIncludingNonS": len(reason_by_key),
        "firstPendingKeysByGames": [row["key"] for row in pending[:20]],
        "manifest": str(prefix.relative_to(FRONTEND)) + ".ndjson.gz",
    }
    Path(str(prefix) + ".json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n"
    )
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
