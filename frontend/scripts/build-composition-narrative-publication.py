"""Export exact-trio narrative availability and compact server content.

Run from the repository root: python3 frontend/scripts/build-composition-narrative-publication.py
The full narratives.v2.json remains the editable source and is never sent to the browser.
"""

import gzip
import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "frontend/data/composition-explanations/narratives.v2.json"
WHY_GOOD_SOURCE = ROOT / "frontend/data/composition-explanations/why-good.v1.json"
OUTPUT_DIR = ROOT / "frontend/src/generated"
KOREAN_L10N = ROOT / "frontend/public/l10n/Korean.json"
REVIEW_DECISIONS = ROOT / "frontend/data/composition-explanations/review-decisions.v1.json"
VALID_KEY = re.compile(r"^\d+:\d+\+\d+:\d+\+\d+:\d+$")
DUPLICATE_SKILL = re.compile(r"([가-힣A-Za-z0-9!~&/· -]{2,60}\([PQWER]\))\s+\1")
PUBLISHABLE_STATUSES = {"assistant-proposed", "user-reviewed"}
COMPARISON_CUE = re.compile(r"같은|비교|대신|다른|바꾸|교체|넣|편성|보다|반면|달리|차이")
COMPARISON_CLAUSE = re.compile(r",\s*같은\s")
COMPARISON_PREFIX_ENDINGS = (
    ("있는데", "있다"),
    ("생기는데", "생긴다"),
    ("되는데", "된다"),
    ("커지는데", "커진다"),
    ("쓰이는데", "쓰인다"),
    ("맡는데", "맡는다"),
    ("얻는데", "얻는다"),
    ("하는데", "한다"),
    ("이어지는데", "이어진다"),
    ("닿는데", "닿는다"),
    ("주는데", "준다"),
    ("끊는데", "끊는다"),
    ("넓어지는데", "넓어진다"),
    ("늘어나는데", "늘어난다"),
    ("노리는데", "노린다"),
    ("흐트러뜨리는데", "흐트러뜨린다"),
    ("연결되는데", "연결된다"),
    ("쉬워지는데", "쉬워진다"),
    ("늦추는데", "늦춘다"),
    ("잇는데", "잇는다"),
    ("견제하는데", "견제한다"),
    ("보태는데", "보탠다"),
    ("없는데", "없다"),
    ("구도인데", "구도다"),
    ("수단인데", "수단이다"),
    ("그림인데", "그림이다"),
    ("구조인데", "구조다"),
    ("핵심인데", "핵심이다"),
    ("화력인데", "화력이다"),
    ("좋은데", "좋다"),
    ("가능한데", "가능하다"),
    ("핵심이며", "핵심이다"),
)
NOMINAL_ENDINGS = {
    word: word[:-1] + "입니다"
    for word in (
        "구도다", "뒤다", "손해다", "딜러다", "구조다", "조건부다", "범위다",
        "먼저다", "제어다", "효과다", "변수다", "둔화다", "때다", "별개다",
        "상태다", "세이브다", "연사다", "지대다", "선택지다", "연계다", "이야기다",
    )
}
SENTENCE_BOUNDARY = re.compile(r"(?<!K\.O\.)(?<=\.)\s+")


def formalize_final_word(word: str) -> str:
    if word.endswith("니다"):
        return word
    if word in NOMINAL_ENDINGS:
        return NOMINAL_ENDINGS[word]
    if word == "번다":
        return "벌어 줍니다"
    assert word.endswith("다"), word
    stem = word[:-1]
    if stem.endswith("는"):
        return stem[:-1] + "습니다"
    last = ord(stem[-1]) - 0xAC00
    assert 0 <= last <= 11171, word
    final_consonant = last % 28
    if final_consonant in (0, 4, 8):
        polite_syllable = chr(ord(stem[-1]) - final_consonant + 17)
        return stem[:-1] + polite_syllable + "니다"
    return stem + "습니다"


def formalize_paragraph(paragraph: str) -> str:
    sentences = []
    for sentence in SENTENCE_BOUNDARY.split(paragraph.strip()):
        # Some older drafts end with a labelled skill list rather than prose.
        if sentence.startswith("스킬 원문:"):
            sentences.append(sentence)
            continue
        final_word = re.search(r"([가-힣]+다)\.$", sentence)
        assert final_word, sentence
        sentences.append(
            sentence[: final_word.start()] + formalize_final_word(final_word.group(1)) + "."
        )
    return " ".join(sentences)


def normalize_game_terms(paragraph: str) -> str:
    """Keep older draft jargon out of the published card copy."""
    return (
        paragraph.replace("활딜 시간을", "데미지를 넣을 시간을")
        .replace("활딜 시간", "데미지를 넣을 시간")
        .replace("활딜 창", "데미지를 넣을 시간")
        .replace("활딜을", "데미지를")
        .replace("활딜이", "데미지가")
        .replace("활딜", "데미지")
    )


def public_source_hash(paragraph: str, member_roles: dict[str, str] | None = None) -> str:
    content = paragraph
    if member_roles:
        content += "\n" + json.dumps(member_roles, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(content.encode()).hexdigest()[:16]


def reviewed_status(key: str, paragraph: str, source_status: str, decisions: dict, member_roles: dict[str, str] | None = None) -> str:
    """Only a human approval of these exact public words can promote the label."""
    decision = decisions.get(key)
    if not decision or decision.get("status") != "approved":
        return source_status
    current_hash = public_source_hash(paragraph, member_roles)
    return "user-reviewed" if decision.get("sourceHash") == current_hash else source_status


def keep_intro_before_comparison(sentence: str) -> str | None:
    match = COMPARISON_CLAUSE.search(sentence)
    if not match:
        return None
    intro = sentence[: match.start()].strip()
    for ending, replacement in COMPARISON_PREFIX_ENDINGS:
        if intro.endswith(ending):
            return intro[: -len(ending)] + replacement + "."
    return None


def without_comparison_sentences(paragraph: str, member_codes: set[int], names: dict[int, str]) -> tuple[str, int]:
    """Keep trio reasoning for readers; retain teammate comparisons in the source evidence."""
    other_names = [
        re.compile(r"(?<![가-힣])" + re.escape(name))
        for code, name in names.items()
        if code not in member_codes
    ]
    sentences = SENTENCE_BOUNDARY.split(paragraph.strip())
    visible = []
    omitted = 0
    for sentence in sentences:
        comparison = COMPARISON_CUE.search(sentence) and any(
            name.search(sentence) for name in other_names
        )
        if comparison:
            omitted += 1
            intro = keep_intro_before_comparison(sentence)
            if intro:
                visible.append(intro)
        else:
            visible.append(sentence)
    return " ".join(visible), omitted


def main() -> None:
    source = json.loads(SOURCE.read_text())
    decision_data = json.loads(REVIEW_DECISIONS.read_text()) if REVIEW_DECISIONS.exists() else {"version": 1, "decisions": {}}
    assert decision_data["version"] == 1
    decisions = decision_data["decisions"]
    narratives = {}
    source_rows = {}
    for row in source["narratives"]:
        key = row["key"]
        assert VALID_KEY.fullmatch(key), key
        assert key not in narratives, key
        assert row["reviewStatus"] in PUBLISHABLE_STATUSES, key
        assert row["paragraph"].strip(), key
        narratives[key] = {
            "paragraph": formalize_paragraph(normalize_game_terms(row["paragraph"])),
            "reviewStatus": reviewed_status(
                key, formalize_paragraph(normalize_game_terms(row["paragraph"])), row["reviewStatus"], decisions
            ),
        }
        source_rows[key] = row

    assert narratives, "No publishable narratives found"
    reason_source = json.loads(WHY_GOOD_SOURCE.read_text())
    korean_l10n = json.loads(KOREAN_L10N.read_text())
    character_names = {
        int(key.rsplit("/", 1)[-1]): value
        for key, value in korean_l10n.items()
        if key.startswith("Character/Name/") and key.rsplit("/", 1)[-1].isdigit()
    }
    assert reason_source["sourceSnapshot"] == source["sourceSnapshot"]
    assert reason_source["sourceUpdatedAtKst"] == source["sourceUpdatedAtKst"]
    snapshot_path = ROOT / "frontend" / source["sourceSnapshot"]
    with gzip.open(snapshot_path, "rt") as snapshot:
        pooled_keys = {json.loads(line)["key"] for line in snapshot if line.strip()}
    reason_keys = set()
    omitted_comparisons = 0
    for reason in reason_source["reasons"]:
        key = reason["key"]
        assert key in source_rows and key in pooled_keys, key
        assert key not in reason_keys, key
        reason_keys.add(key)
        assert reason["reviewStatus"] in PUBLISHABLE_STATUSES, key
        assert not (
            source_rows[key]["reviewStatus"] == "user-reviewed"
            and reason["reviewStatus"] != "user-reviewed"
        ), f"Cannot overwrite a user-reviewed explanation: {key}"
        assert reason["whyGood"].strip() and reason["addedValue"].strip(), key
        assert reason["strength"].strip() and reason["whyGood"].startswith(
            reason["strength"] + " "
        ), key
        assert not DUPLICATE_SKILL.search(reason["whyGood"]), (
            f"Repeated skill name in explanation: {key}"
        )
        member_codes = {int(member.split(":")[0]) for member in key.split("+")}
        public_paragraph, omitted = without_comparison_sentences(
            reason["whyGood"], member_codes, character_names
        )
        assert public_paragraph.startswith(reason["strength"]), key
        assert public_paragraph.count(".") >= 2, key
        public_paragraph = formalize_paragraph(normalize_game_terms(public_paragraph))
        public_strength = formalize_paragraph(normalize_game_terms(reason["strength"]))
        assert public_paragraph.startswith(public_strength), key
        omitted_comparisons += omitted
        focus_pair = reason["focusPair"].split("+")
        assert len(focus_pair) == 2 and all(member in key.split("+") for member in focus_pair), key
        assert len(reason["comparisonKeys"]) >= 2, key
        assert all(
            comparison in pooled_keys
            and comparison != key
            and all(member in comparison.split("+") for member in focus_pair)
            for comparison in reason["comparisonKeys"]
        ), key
        assert set(reason["skillSourceKeys"]).issubset(
            source_rows[key]["evidence"]["skillSourceKeys"]
        ), key
        key_skill_sources = reason["keySkillSourceKeys"]
        assert key_skill_sources and len(key_skill_sources) == len(set(key_skill_sources)), key
        assert set(key_skill_sources).issubset(reason["skillSourceKeys"]), key
        key_skills = []
        # Older rows sometimes selected a different skill variant as their key
        # source. Fall back to the row's cited sources only when none of those
        # selected sources appears in the published explanation.
        for candidate_sources in (key_skill_sources, reason["skillSourceKeys"]):
            for source_key in candidate_sources:
                skill_id = source_key.rsplit("/", 1)[-1]
                character_code = int(skill_id[1:4])
                assert str(character_code) in {member.split(":")[0] for member in key.split("+")}, key
                slot = int(skill_id[4:6])
                if character_code == 48:  # Tia stores color variants in 40/50/60/70.
                    skill_letter = {10: "P", 40: "Q", 41: "Q", 42: "Q", 50: "W", 51: "W", 52: "W", 60: "E", 61: "E", 62: "E", 70: "R"}[slot]
                elif character_code == 27 and slot in (60, 70, 80):  # Alex's melee form.
                    skill_letter = {60: "Q", 70: "W", 80: "E"}[slot]
                else:
                    skill_letter = {10: "P", 20: "Q", 21: "Q", 22: "Q", 30: "W", 31: "W", 40: "E", 41: "E", 50: "R"}.get(slot)
                if not skill_letter:
                    continue
                character_name = korean_l10n[f"Character/Name/{character_code}"]
                lobby_name = korean_l10n.get(f"Skill/LobbyName/{skill_id}")
                group_name = korean_l10n.get(f"Skill/Group/Name/{skill_id}")
                aliases = dict.fromkeys(
                    alias.strip()
                    for name in (lobby_name, group_name)
                    if name
                    for alias in (name, *name.split(" / "), name.split(" - ", 1)[0])
                )
                # A source key is provenance; show only a skill actually named
                # in the public paragraph, including official short aliases.
                matched = next(
                    (alias for alias in aliases if f"{alias}({skill_letter})" in public_paragraph),
                    None,
                )
                if matched:
                    label = f"{character_name} {matched}({skill_letter})"
                    if label not in key_skills:
                        key_skills.append(label)
            if key_skills:
                break
        assert reason["unobserved"].strip(), key
        narratives[key] = {
            "paragraph": public_paragraph,
            "strength": public_strength,
            "keySkills": key_skills,
            "reviewStatus": reviewed_status(key, public_paragraph, reason["reviewStatus"], decisions, reason.get("memberRoles")),
            "focus": "why-good",
        }
        if "memberRoles" in reason:
            assert set(reason["memberRoles"]) == set(key.split("+")), key
            narratives[key]["memberRoles"] = reason["memberRoles"]

    sorted_narratives = dict(sorted(narratives.items()))
    index = {
        "sourceUpdatedAtKst": source["sourceUpdatedAtKst"],
        "keys": list(sorted_narratives),
        "reasonKeys": sorted(reason_keys),
    }
    content = {
        "sourceUpdatedAtKst": source["sourceUpdatedAtKst"],
        "narratives": sorted_narratives,
    }
    (OUTPUT_DIR / "compositionNarrativeIndex.json").write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n"
    )
    (OUTPUT_DIR / "compositionNarrativeContent.json").write_text(
        json.dumps(content, ensure_ascii=False, separators=(",", ":")) + "\n"
    )
    print(
        f"Exported {len(narratives)} narratives, including {len(reason_keys)} reason-first rewrites; "
        f"omitted {omitted_comparisons} comparison sentences from public text"
    )


if __name__ == "__main__":
    main()
