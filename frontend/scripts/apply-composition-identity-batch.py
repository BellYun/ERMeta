"""Apply a bounded, human-readable identity/strength/limit review batch.

Run from the repository root:
  python3 frontend/scripts/apply-composition-identity-batch.py \
    frontend/data/composition-explanations/identity-batches/2026-10-24-batch-001.json

The input is an assistant proposal. This script does not approve its tactical claims.
"""

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
REASONS = ROOT / "frontend/data/composition-explanations/why-good.v1.json"
NARRATIVES = ROOT / "frontend/data/composition-explanations/narratives.v2.json"
SKILLS = ROOT / "frontend/analysis-snapshots/composition-affinity/composition-skill-source-catalog-2026-10-14.json"


def skill_slot(skill_id: str, character_code: int) -> str | None:
    slot = int(skill_id[4:6])
    if character_code == 48:
        return {10: "P", 40: "Q", 41: "Q", 42: "Q", 50: "W", 51: "W", 52: "W", 60: "E", 61: "E", 62: "E", 70: "R"}.get(slot)
    if character_code == 57:
        return {10: "P", 20: "Q", 21: "Q", 30: "W", 31: "W", 40: "E", 43: "E", 50: "R", 51: "R"}.get(slot)
    if character_code == 27 and slot in (60, 70, 80):
        return {60: "Q", 70: "W", 80: "E"}[slot]
    return {10: "P", 20: "Q", 21: "Q", 22: "Q", 30: "W", 31: "W", 40: "E", 41: "E", 50: "R"}.get(slot)


def mentioned_skill_sources(paragraph: str, members: list[str], catalog: dict) -> list[str]:
    """Keep the review panel's skill excerpts aligned with the new paragraph."""
    found = []
    for member in members:
        for skill in catalog[member]["skills"]:
            source = skill["sourceKey"]
            skill_id = source.rsplit("/", 1)[-1]
            if not source.startswith("Skill/LobbyDesc/") or len(skill_id) < 7:
                continue
            slot = skill_slot(skill_id, int(member.split(":", 1)[0]))
            name = skill.get("name")
            if not slot or not name or f"{name}({slot})" not in paragraph:
                continue
            # Shape variants can repeat one display name. Prefer its base source.
            if skill_id[-2:] != "00" and any(
                prior["name"] == name
                and prior["sourceKey"].rsplit("/", 1)[-1][-2:] == "00"
                for prior in catalog[member]["skills"]
            ):
                continue
            if source not in found:
                found.append(source)
    assert found, f"No official skill references found in {paragraph}"
    return found


def sentence(value: str, field: str, key: str) -> str:
    assert value and value == value.strip() and value.endswith("."), (key, field)
    assert ". " not in value, (key, field)
    return value


def validate_role_skill_ownership(key: str, member_roles: dict[str, str], catalog: dict) -> None:
    """Catch roles assigned to another member when their named skill is the only clue."""
    names = {
        member: {skill["name"] for skill in catalog[member]["skills"] if skill.get("name")}
        for member in member_roles
    }
    for member, role in member_roles.items():
        own = {name for name in names[member] if name in role}
        other = {
            f"{teammate}:{name}"
            for teammate in member_roles
            if teammate != member
            for name in names[teammate]
            if len(name) >= 3 and name not in names[member] and name in role
        }
        assert not (other and not own), (
            f"Role may be assigned to the wrong member: {key} {member} {sorted(other)}"
        )


def validate_identity_members(key: str, identity: str, catalog: dict) -> None:
    """Require the identity sentence to name each exact character and weapon."""
    for member in key.split("+"):
        source = catalog[member]
        label = f"{source['characterName']} {source['weaponName']}"
        assert label in identity, f"Wrong or missing member label: {key} {label}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("batch", type=Path)
    args = parser.parse_args()
    batch = json.loads(args.batch.read_text())
    assert batch["status"] == "assistant-proposed"
    rows = batch["rows"]
    assert 1 <= len(rows) <= 20, len(rows)
    keys = [row["key"] for row in rows]
    assert len(keys) == len(set(keys)), "Duplicate composition key"

    source = json.loads(REASONS.read_text())
    reasons = {row["key"]: row for row in source["reasons"]}
    narratives = json.loads(NARRATIVES.read_text())
    narrative_by_key = {row["key"]: row for row in narratives["narratives"]}
    catalog = {
        row["member"]: row
        for row in json.loads(SKILLS.read_text())["members"]
    }
    for row in rows:
        key = row["key"]
        assert key in reasons, f"Unknown composition: {key}"
        assert key in narrative_by_key, f"Missing narrative evidence: {key}"
        reason = reasons[key]
        assert reason["reviewStatus"] == "assistant-proposed", f"User-reviewed: {key}"
        identity = sentence(row["identity"], "identity", key)
        why = sentence(row["why"], "why", key)
        limit = sentence(row["break"], "break", key)
        assert identity.endswith(("조합이다.", "편성이다.", "조합입니다.", "편성입니다.")), key
        validate_identity_members(key, identity, catalog)
        reason["strength"] = identity
        reason["addedValue"] = why[:-1]
        reason["whyGood"] = " ".join((identity, why, limit))
        key_skill_sources = mentioned_skill_sources(reason["whyGood"], key.split("+"), catalog)
        reason["keySkillSourceKeys"] = key_skill_sources
        reason["skillSourceKeys"] = list(dict.fromkeys(
            [*reason.get("skillSourceKeys", []), *key_skill_sources]
        ))
        narrative_evidence = narrative_by_key[key]["evidence"]
        narrative_evidence["skillSourceKeys"] = list(dict.fromkeys(
            [*narrative_evidence["skillSourceKeys"], *key_skill_sources]
        ))
        member_roles = row.get("memberRoles")
        assert isinstance(member_roles, dict), f"Missing member roles: {key}"
        assert set(member_roles) == set(key.split("+")), f"Wrong member roles: {key}"
        assert all(isinstance(role, str) and role.strip() == role and role for role in member_roles.values()), key
        validate_role_skill_ownership(key, member_roles, catalog)
        reason["memberRoles"] = member_roles
        if row.get("unobserved"):
            reason["unobserved"] = sentence(row["unobserved"], "unobserved", key)

    REASONS.write_text(json.dumps(source, ensure_ascii=False, indent=2) + "\n")
    NARRATIVES.write_text(json.dumps(narratives, ensure_ascii=False, indent=2) + "\n")
    print(f"Applied {len(rows)} assistant-proposed explanations from {args.batch}")


if __name__ == "__main__":
    main()
