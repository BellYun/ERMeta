"""Build a compact, read-only S-composition review queue from the current sources.

Run from the repository root:
  python3 frontend/scripts/build-composition-review-queue.py

The groups and flags are editorial search aids, not tactical verification.
"""

import gzip
import hashlib
import json
import re
from collections import Counter
from pathlib import Path


FRONTEND = Path(__file__).resolve().parents[1]
ROOT = FRONTEND.parent
INVENTORIES = FRONTEND / "analysis-snapshots/composition-affinity"
REASONS = FRONTEND / "data/composition-explanations/why-good.v1.json"
CONTENT = FRONTEND / "src/generated/compositionNarrativeContent.json"
L10N = FRONTEND / "public/l10n/Korean.json"
WEAPONS = FRONTEND / "src/lib/weaponMap.ts"
OUTPUT = FRONTEND / "src/generated/compositionReviewQueue.json"

# These are overlapping ways to find similar prose. They do not assign a game role.
GROUPS = (
    ("save", "세이브·재교전", r"세이브|공연|다시 싸|재교전|살아서 다시"),
    ("setup", "설치·지형", r"폭탄|포탑|센트리건|덫|장치|기물|불길|지대|벽"),
    ("poke", "포킹·선제 견제", r"포킹|견제|저격|먼 거리|긴 사거리"),
    ("front", "1선·후열 딜각", r"1선|전열|앞선|후열|딜각|사선"),
    ("engage", "진입·받아치기", r"진입|받아치|도발|제압|추격"),
    ("sustain", "회복·긴 교전", r"회복|보호막|지속|긴 교전|오래"),
)


def member_name(member: str, names: dict[str, str], weapons: dict[str, str]) -> str:
    code, weapon = member.split(":")
    return f"{names[code]} {weapons.get(weapon, weapon)}"


def skill_letter(character_code: int, slot: int) -> str | None:
    if character_code == 48:
        return {10: "P", 40: "Q", 41: "Q", 42: "Q", 50: "W", 51: "W", 52: "W", 60: "E", 61: "E", 62: "E", 70: "R"}.get(slot)
    if character_code == 57:
        return {10: "P", 20: "Q", 21: "Q", 30: "W", 31: "W", 40: "E", 43: "E", 50: "R", 51: "R"}.get(slot)
    if character_code == 27 and slot in (60, 70, 80):
        return {60: "Q", 70: "W", 80: "E"}[slot]
    return {10: "P", 20: "Q", 21: "Q", 22: "Q", 30: "W", 31: "W", 40: "E", 41: "E", 50: "R", 51: "R", 52: "R", 53: "R", 54: "R"}.get(slot)


def official_tokens(l10n: dict[str, str]) -> dict[int, set[str]]:
    by_character: dict[int, set[str]] = {}
    for key, name in l10n.items():
        match = re.fullmatch(r"Skill/(?:LobbyName|Group/Name)/(\d+)", key)
        if not match:
            continue
        skill_id = match.group(1)
        character_code = int(skill_id[1:4])
        letter = skill_letter(character_code, int(skill_id[4:6]))
        if letter:
            aliases = {name}
            aliases.update(part.strip() for part in name.split(" / "))
            if " - " in name:
                aliases.add(name.split(" - ", 1)[0])
            aliases.add(re.sub(r"\([^PQWER)]{2,}\)", "", name).strip())
            by_character.setdefault(character_code, set()).update(
                f"{alias}({letter})" for alias in aliases if alias
            )
    return by_character


def unmatched_skill_mentions(key: str, paragraph: str, tokens: dict[int, set[str]]) -> list[str]:
    member_tokens = set().union(*(tokens.get(int(member.split(":")[0]), set()) for member in key.split("+")))
    missing = []
    for match in re.finditer(r"\([PQWER]\)", paragraph):
        if not any(paragraph[:match.end()].endswith(token) for token in member_tokens):
            missing.append(paragraph[max(0, match.start() - 32):match.end()].split(". ")[-1])
    return missing


def flags_for(key: str, paragraph: str, games: int, skill_count: int, unmatched: list[str]) -> list[str]:
    flags = []
    if unmatched:
        flags.append("스킬 표기 확인")
    if "8:22" in key.split("+") and "Peacemaker(R)" in paragraph:
        flags.append("하트 궁 효과")
        if re.search(r"처치|마무리", paragraph) and not re.search(
            r"죽지|사망하지|사망 방지|적도 살리|처치할 수 없|마무리할 수 없", paragraph
        ):
            flags.append("하트 궁 처치 문장 확인")
    if re.search(r"반드시|무조건|무적|확정(?:한다|된다|입니다|할 수 있다|할 수 있습니다)", paragraph):
        flags.append("단정 표현")
    if re.search(r"잃은 체력|중첩|조건|적중|범위 안|벽 충돌", paragraph):
        flags.append("스킬 조건")
    if games < 10:
        flags.append("10판 미만")
    elif games < 30:
        flags.append("30판 미만")
    if skill_count == 0:
        flags.append("표시된 근거 스킬 없음")
    return flags


def public_source_hash(paragraph: str, member_roles: dict[str, str] | None = None) -> str:
    content = paragraph
    if member_roles:
        content += "\n" + json.dumps(member_roles, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(content.encode()).hexdigest()[:16]


def main() -> None:
    inventory = sorted(INVENTORIES.glob("why-good-review-inventory-*.ndjson.gz"))[-1]
    with gzip.open(inventory, "rt") as stream:
        s_rows = [json.loads(line) for line in stream if line.strip()]
    published = json.loads(CONTENT.read_text())["narratives"]
    reasons = {row["key"]: row for row in json.loads(REASONS.read_text())["reasons"]}
    l10n = json.loads(L10N.read_text())
    tokens = official_tokens(l10n)
    names = {
        key.rsplit("/", 1)[-1]: value
        for key, value in l10n.items()
        if key.startswith("Character/Name/") and key.rsplit("/", 1)[-1].isdigit()
    }
    weapon_section = WEAPONS.read_text().split("export const WEAPON_KOR_BY_CODE:", 1)[1].split("};", 1)[0]
    weapons = dict(re.findall(r'(\d+):\s*"([^"]+)"', weapon_section))
    rows = []
    for source in s_rows:
        key = source["key"]
        narrative = published.get(key)
        assert narrative, f"Missing published explanation: {key}"
        paragraph = narrative["paragraph"]
        strength = narrative.get("strength") or paragraph.split(". ", 1)[0] + "."
        assert paragraph.startswith(strength), key
        assert not re.search(r"활딜|데미지을|데미지이", paragraph), key
        members = key.split("+")
        groups = [group_id for group_id, _, pattern in GROUPS if re.search(pattern, paragraph)]
        if not groups:
            groups = ["other"]
        reason = reasons.get(key)
        games = source["games"]
        unmatched = unmatched_skill_mentions(key, paragraph, tokens)
        rows.append({
            "key": key,
            "label": " · ".join(member_name(member, names, weapons) for member in members),
            "games": games,
            "wins": source["wins"],
            "averageRank": round(source["averageRank"], 2),
            "groups": groups,
            "flags": flags_for(key, paragraph, games, len(narrative.get("keySkills", [])), unmatched),
            "unmatchedSkillMentions": unmatched,
            "strength": strength,
            "reviewStatus": narrative["reviewStatus"],
            "sourceHash": public_source_hash(paragraph, narrative.get("memberRoles")),
            "hasReasonFirst": bool(reason),
        })
    assert len(rows) == len({row["key"] for row in s_rows})
    group_counts = Counter(group for row in rows for group in row["groups"])
    flag_counts = Counter(flag for row in rows for flag in row["flags"])
    payload = {
        "version": 1,
        "sourceUpdatedAtKst": json.loads(CONTENT.read_text())["sourceUpdatedAtKst"],
        "inventory": inventory.name,
        "total": len(rows),
        "groups": [{"id": group_id, "label": label, "count": group_counts[group_id]} for group_id, label, _ in GROUPS]
        + [{"id": "other", "label": "기타 문장", "count": group_counts["other"]}],
        "flagCounts": dict(sorted(flag_counts.items())),
        "rows": rows,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(json.dumps({"total": len(rows), "groups": dict(group_counts), "flags": dict(flag_counts)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
