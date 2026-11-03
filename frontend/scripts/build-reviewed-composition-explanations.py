"""Export the 186 individually judged composition notes for the synergy detail UI.

Run from any directory: python3 frontend/scripts/build-reviewed-composition-explanations.py
The Markdown reviews remain the editable source of the tactical prose.
"""

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
REVIEW_DIR = (
    ROOT
    / "knowledge/eternal-return/community/composition/validations"
    / "2026-10-16-s-held-no-tank-annotation"
)
WORKLIST = REVIEW_DIR / "worklist.ndjson"
OUTPUT = ROOT / "frontend/src/generated/reviewedCompositionExplanations.json"


def plain_text(markdown: str) -> str:
    text = re.sub(r"\*\*|`", "", markdown)
    return re.sub(r"\s+", " ", text).strip()


def extract_paragraph(document: str, key: str) -> str:
    escaped = re.escape(key)
    # The final review batches put the exact key below each heading.
    match = re.search(rf"^`{escaped}`\s*\n\s*\n([^\n]+)", document, re.MULTILINE)
    if match:
        return plain_text(match.group(1))

    # Earlier reviews used a heading containing the key.
    match = re.search(
        rf"^### [^\n]*\(`{escaped}`\)\s*\n\s*\n(.+?)(?=\n\s*\n(?:### |## |\Z))",
        document,
        re.MULTILINE | re.DOTALL,
    )
    if match:
        return plain_text(match.group(1))

    # The two middle batches used one numbered paragraph per line.
    match = re.search(rf"^\d+\. \*\*[^\n]*\(`{escaped}`\)\.\*\* (.+)$", document, re.MULTILINE)
    if match:
        return plain_text(match.group(1))

    raise ValueError(f"No individual explanation for {key}")


def first_reason(paragraph: str) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", paragraph)
    # A few early entries begin with a short thesis label such as
    # "교전 개시 둘 + 추격 연결."; use the first explanatory sentence instead.
    for sentence in sentences:
        if len(sentence) >= 35 and not sentence.startswith("판단:"):
            return sentence
    return sentences[0]


def main() -> None:
    rows = [json.loads(line) for line in WORKLIST.read_text().splitlines()]
    assert len(rows) == 186
    source_dates = {row["sourceUpdatedAtKst"] for row in rows}
    assert len(source_dates) == 1, source_dates
    documents: dict[Path, str] = {}
    compositions: dict[str, dict[str, object]] = {}

    for row in rows:
        assert row["reviewStatus"] == "assistant-judged", row["key"]
        path = (REVIEW_DIR / row["reviewDocument"]).resolve()
        if path not in documents:
            documents[path] = path.read_text()
        paragraph = extract_paragraph(documents[path], row["key"])
        assert len(paragraph) >= 80, row["key"]
        compositions[row["key"]] = {
            "summary": first_reason(paragraph),
            "paragraph": paragraph,
            "sourceGames": row["metrics"]["games"],
        }

    assert len(compositions) == 186
    output = {
        "sourceUpdatedAtKst": source_dates.pop(),
        "reviewStatus": "assistant-judged",
        "compositions": dict(sorted(compositions.items())),
    }
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    print(f"Wrote {len(compositions)} explanations to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
