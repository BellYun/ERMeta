"""Build public statistics assets from a completed local ranged backup.

From frontend/: python3 scripts/export-season-snapshot.py /path/to/ranged-backup
"""
from collections import OrderedDict, defaultdict
from contextlib import contextmanager
import gzip
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys
from tempfile import TemporaryDirectory

FRONTEND = Path(__file__).resolve().parents[1]
BACKUP = Path(sys.argv[1]).resolve()
TABLES = {
    row["name"].split(".", 1)[1].strip('"'): row
    for row in json.loads((BACKUP / "manifest.json").read_text())["tables"]
    if row["schema"] == "public"
}
MAX_PATCH = (12, 7)
CORE_SHARD_COUNT = 512


def copy_rows(table):
    relation = TABLES[table]
    columns = [column.strip('"') for column in relation["columns"].split(",")]
    count = 0
    for page in sorted((BACKUP / "tables" / relation["oid"]).glob("*.sql.gz")):
        with gzip.open(page, "rt") as stream:
            for line in stream:
                if line.startswith("COPY "):
                    break
            else:
                raise ValueError(f"No COPY data in {page}")
            for line in stream:
                if line == "\\.\n":
                    break
                row = line.rstrip("\n").split("\t")
                if len(row) != len(columns):
                    raise ValueError(f"Unexpected columns in {page}")
                count += 1
                yield row
            else:
                raise ValueError(f"Unterminated COPY in {page}")
    if count != relation["rows"]:
        raise ValueError(f"{table}: {count} of {relation['rows']} rows")


def patch_number(patch):
    if not re.fullmatch(r"\d+\.\d+", patch):
        return None
    return tuple(map(int, patch.split(".")))


def build_patch(patch):
    number = patch_number(patch)
    return number is not None and (11, 1) <= number <= MAX_PATCH and number != (12, 0)


def integer(value):
    return None if value == "\\N" else int(value)


def number(value):
    if value == "\\N":
        return 0
    return float(value) if "." in value or "e" in value.lower() else int(value)


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def write_json(directory, name, value, compressed=False):
    path = directory / name
    path.parent.mkdir(parents=True, exist_ok=True)
    data = compact(value).encode()
    path.write_bytes(gzip.compress(data, compresslevel=6, mtime=0) if compressed else data)


@contextmanager
def grouped_files(directory):
    directory.mkdir(parents=True, exist_ok=True)
    streams = OrderedDict()

    def append(key, row):
        stream = streams.pop(key, None)
        if stream is None:
            if len(streams) >= 96:
                streams.popitem(last=False)[1].close()
            stream = (directory / key).open("a")
        streams[key] = stream
        stream.write(compact(row) + "\n")

    try:
        yield append
    finally:
        for stream in streams.values():
            stream.close()


def export_stats(output):
    patches = [
        {"version": row[1], "startDate": row[2].replace(" ", "T"), "isActive": row[4] == "t"}
        for row in copy_rows("PatchVersion")
        if patch_number(row[1]) is not None and patch_number(row[1]) <= MAX_PATCH
    ]
    patches.sort(key=lambda row: row["startDate"], reverse=True)
    by_patch = defaultdict(list)
    for character, weapon, games, wins, rp, top3, rank, tier, patch in copy_rows("v2_CharacterStats"):
        if patch_number(patch) is None or patch_number(patch) > MAX_PATCH:
            continue
        by_patch[patch].append({
            "characterNum": int(character), "bestWeapon": integer(weapon),
            "totalGames": int(games), "totalWins": int(wins), "totalRP": number(rp),
            "totalTop3": int(top3), "averageRank": number(rank), "tier": tier, "patchVersion": patch,
        })
    for patch, rows in by_patch.items():
        write_json(output, f"stats/{patch}.json", rows)
    return patches, sorted(by_patch, key=patch_number, reverse=True)


def export_character_stats(output):
    by_character = defaultdict(dict)
    for path in sorted((output / "stats").glob("*.json")):
        by_tier = defaultdict(int)
        rows = json.loads(path.read_bytes())
        for row in rows:
            by_tier[row["tier"]] += row["totalGames"]
        for row in rows:
            patches = by_character[row["characterNum"]]
            patch = patches.setdefault(path.stem, {"rows": [], "gamesByTier": by_tier})
            patch["rows"].append(row)
    for character, patches in by_character.items():
        write_json(output, f"character-stats/{character}.json", patches)


def capped_groups(rows, games_index, limits):
    """Keep every row that can appear within a query's existing limit."""
    rows.sort(key=lambda row: -row[games_index])
    counters = [defaultdict(int) for _ in limits]
    selected = []
    for row in rows:
        keep = False
        for counter, (indexes, limit) in zip(counters, limits):
            key = tuple(row[index] for index in indexes)
            if counter[key] < limit:
                counter[key] += 1
                keep = True
        if keep:
            selected.append(row)
    return selected


def export_builds(output, temp):
    tactical = defaultdict(list)
    for char, weapon, tier, patch, skill, games, wins, rank, rp, _ in copy_rows(
        "v2_CharacterTacticalStats"
    ):
        if build_patch(patch):
            tactical[f"{patch}-{char}"].append([
                tier, integer(weapon), integer(skill), number(games), number(wins),
                number(rank), number(rp),
            ])

    tables = [
        ("equipment", "v2_CharacterEquipmentBuildStats", 0, 12),
        ("traits", "v2_CharacterTraitBuildStats", 0, 10),
        ("skills", "v2_CharacterSkillOrder", 1, 8),
    ]
    for kind, table, character_index, patch_index in tables:
        spool = temp / kind
        with grouped_files(spool) as append:
            for row in copy_rows(table):
                patch = row[patch_index]
                if not build_patch(patch):
                    continue
                key = f"{patch}-{row[character_index]}"
                if kind == "equipment":
                    data = [row[11], *map(integer, row[1:7]), *map(number, row[7:11])]
                elif kind == "traits":
                    data = [row[9], integer(row[8]), *map(integer, row[1:6]), *map(number, row[6:8])]
                else:
                    data = [
                        row[7], integer(row[2]), integer(row[3]),
                        list(map(int, row[4][1:-1].split(","))) if row[4] not in ("\\N", "{}") else [],
                        number(row[5]), number(row[6]), number(row[10]),
                    ]
                append(key, data)
        exported = set()
        for path in sorted(spool.iterdir()):
            with path.open() as stream:
                rows = [json.loads(line) for line in stream]
            if kind == "equipment":
                rows = capped_groups(rows, 7, [((0,), 200), ((0, 1), 200)])
            elif kind == "traits":
                rows = capped_groups(rows, 7, [((0, 1), 1000)])
            else:
                rows = capped_groups(rows, 4, [((0, 1, 2), 1000)])
                rows = {"orders": rows, "tactical": tactical.get(path.name, [])}
            write_json(output, f"builds/{kind}/{path.name}.json.gz", rows, True)
            exported.add(path.name)
        if kind == "skills":
            for key in tactical.keys() - exported:
                write_json(output, f"builds/skills/{key}.json.gz", {
                    "orders": [], "tactical": tactical[key],
                }, True)
        shutil.rmtree(spool)
        print(f"{kind}: {len(exported)} buckets", flush=True)


def core_shard(members):
    value = 0
    for character, weapon in members:
        value = (value * 31 + character) % CORE_SHARD_COUNT
        value = (value * 31 + weapon) % CORE_SHARD_COUNT
    return value


def export_cores(output, temp):
    spool = temp / "cores"
    with grouped_files(spool) as append:
        for row in copy_rows("v2_CharacterTrioWeaponPairLookup_all_next"):
            members = tuple((int(row[i]), int(row[i + 1])) for i in (4, 7, 10))
            if tuple(sorted(members)) != members:
                raise ValueError("Unexpected noncanonical trio in the pair index")
            names = [f"{character}:{weapon}" for character, weapon in members]
            pairs = ["|".join(names[i] for i in indexes) for indexes in ((0, 1), (0, 2), (1, 2))]
            pair = pairs.index(row[3])
            stats = [*map(integer, (row[6], row[9], row[12])), *map(number, row[13:17])]
            append(str(core_shard(members)), ["|".join(names), pair, stats])
    count = 0
    for shard in range(CORE_SHARD_COUNT):
        by_trio = defaultdict(lambda: defaultdict(list))
        path = spool / str(shard)
        if path.exists():
            with path.open() as stream:
                for line in stream:
                    trio, pair, row = json.loads(line)
                    by_trio[trio][pair].append(row)
        result = {}
        for trio, by_pair in sorted(by_trio.items()):
            groups = {}
            for pair, rows in sorted(by_pair.items()):
                rows.sort(key=lambda row: (-row[3], *(value or 0 for value in row[:3])))
                key = compact(rows[:200])
                groups[key] = groups.get(key, 0) | 1 << pair
            result[trio] = [[mask, json.loads(rows)] for rows, mask in groups.items()]
        write_json(output, f"cores/{shard}.json.gz", result, True)
        count += len(result)
    shutil.rmtree(spool)
    print(f"cores: {count} trios", flush=True)
    return count


def export_og(output):
    source = json.loads((FRONTEND / "src/data/trio-builder-snapshot.json").read_text())
    directory = FRONTEND / "public/data/trio-builder" / source["version"]
    by_chars = defaultdict(lambda: [0, 0, 0, 0])
    for path in sorted(directory.glob("*.json")):
        anchor = tuple(map(int, path.stem.split("-")))
        for row in json.loads(path.read_bytes())["items"]:
            if tuple(row[:2]) == anchor:
                stats = by_chars[(row[0], row[2], row[4])]
                for index, value in enumerate(row[6:]):
                    stats[index] += value
    rows = [[*characters, *stats] for characters, stats in by_chars.items()]
    rows.sort(key=lambda row: (-row[3], *row[:3]))
    write_json(output, "og.json.gz", rows, True)


def main():
    # Stage before publishing a new immutable path. Existing releases remain usable.
    with TemporaryDirectory(prefix="ermeta-season-snapshot-") as directory:
        temp = Path(directory)
        output = temp / "public"
        patches, stats_patches = export_stats(output)
        export_character_stats(output)
        export_builds(output, temp)
        core_trios = export_cores(output, temp)
        export_og(output)
        publish_snapshot(output, patches, stats_patches, core_trios)


def publish_snapshot(output, patches, stats_patches, core_trios):
    digest = hashlib.sha256()
    for path in sorted(output.rglob("*")):
        if path.is_file():
            digest.update(str(path.relative_to(output)).encode() + b"\0" + path.read_bytes())
    version = digest.hexdigest()[:16]
    destination = FRONTEND / "public/data/season-stats" / version
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not destination.exists():
        shutil.move(output, destination)
    manifest = {
        "version": version, "patches": patches, "statsPatches": stats_patches,
        "coreShardCount": CORE_SHARD_COUNT, "coreTrios": core_trios,
    }
    (FRONTEND / "src/data/season-stats-snapshot.json").write_text(
        json.dumps(manifest, indent=2) + "\n"
    )
    print(compact({"version": version, "statsPatches": len(stats_patches), "coreTrios": core_trios}))


if __name__ == "__main__":
    main()
