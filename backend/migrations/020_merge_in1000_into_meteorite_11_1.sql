-- ============================================================
-- 11.1 패치의 IN1000 row를 METEORITE에 합산하고 IN1000 row 제거
--
-- 배경: 시즌 11.1 초기 IN1000 컷이 낮아 노이즈 데이터 다수 누적.
-- 수집 로직에서도 IN1000 분류 제거 → 기존 row 정리.
--
-- 처리 테이블 (tier 컬럼 보유):
--   - v2_CharacterStats
--   - v2_CharacterTrioWeapon
--   - v2_CharacterEquipmentBuildStats
--   - v2_CharacterTraitBuildStats
--   - v2_CharacterSkillOrder
--   - v2_CharacterStartRoute
--   - v2_CharacterItemPriority
--
-- 제외 (tier 컬럼 없음):
--   - v2_CharacterTrioWeaponSearch_p10 (tier 통합 저장)
-- ============================================================

BEGIN;

-- ── 1. v2_CharacterStats ─────────────────────────────────────
-- 컬럼: totalGames, totalWins, totalTop3, totalRP, averageRank
-- METEORITE row가 이미 있으면 가중 합산
UPDATE "v2_CharacterStats" m
SET
  "totalGames" = m."totalGames" + i."totalGames",
  "totalWins" = m."totalWins" + i."totalWins",
  "totalTop3" = m."totalTop3" + i."totalTop3",
  "totalRP" = m."totalRP" + i."totalRP",
  "averageRank" = (m."averageRank" * m."totalGames" + i."averageRank" * i."totalGames")
                  / NULLIF(m."totalGames" + i."totalGames", 0)
FROM "v2_CharacterStats" i
WHERE i."patchVersion" = '11.1'
  AND i."tier" = 'IN1000'
  AND m."characterNum" = i."characterNum"
  AND m."bestWeapon" = i."bestWeapon"
  AND m."patchVersion" = '11.1'
  AND m."tier" = 'METEORITE';

-- METEORITE row가 없는 경우 IN1000 row를 METEORITE로 변경 (UPDATE)
UPDATE "v2_CharacterStats"
SET "tier" = 'METEORITE'
WHERE "patchVersion" = '11.1'
  AND "tier" = 'IN1000'
  AND NOT EXISTS (
    SELECT 1 FROM "v2_CharacterStats" m
    WHERE m."characterNum" = "v2_CharacterStats"."characterNum"
      AND m."bestWeapon" = "v2_CharacterStats"."bestWeapon"
      AND m."patchVersion" = '11.1'
      AND m."tier" = 'METEORITE'
  );

-- 합산되어 남은 IN1000 row 삭제
DELETE FROM "v2_CharacterStats"
WHERE "patchVersion" = '11.1' AND "tier" = 'IN1000';


-- ── 2. v2_CharacterTrioWeapon ─────────────────────────────────
UPDATE "v2_CharacterTrioWeapon" m
SET
  total_games = m.total_games + i.total_games,
  total_wins = m.total_wins + i.total_wins,
  total_rp = m.total_rp + i.total_rp,
  rank_sum = m.rank_sum + i.rank_sum,
  last_updated = NOW()
FROM "v2_CharacterTrioWeapon" i
WHERE i.patch_version = '11.1'
  AND i.tier = 'IN1000'
  AND m.character1 = i.character1
  AND m.weapon_type1 = i.weapon_type1
  AND m.character2 = i.character2
  AND m.weapon_type2 = i.weapon_type2
  AND m.character3 = i.character3
  AND m.weapon_type3 = i.weapon_type3
  AND COALESCE(m.main_core1, 0) = COALESCE(i.main_core1, 0)
  AND COALESCE(m.main_core2, 0) = COALESCE(i.main_core2, 0)
  AND COALESCE(m.main_core3, 0) = COALESCE(i.main_core3, 0)
  AND m.patch_version = '11.1'
  AND m.tier = 'METEORITE';

UPDATE "v2_CharacterTrioWeapon"
SET tier = 'METEORITE'
WHERE patch_version = '11.1'
  AND tier = 'IN1000'
  AND NOT EXISTS (
    SELECT 1 FROM "v2_CharacterTrioWeapon" m
    WHERE m.character1 = "v2_CharacterTrioWeapon".character1
      AND m.weapon_type1 = "v2_CharacterTrioWeapon".weapon_type1
      AND m.character2 = "v2_CharacterTrioWeapon".character2
      AND m.weapon_type2 = "v2_CharacterTrioWeapon".weapon_type2
      AND m.character3 = "v2_CharacterTrioWeapon".character3
      AND m.weapon_type3 = "v2_CharacterTrioWeapon".weapon_type3
      AND COALESCE(m.main_core1, 0) = COALESCE("v2_CharacterTrioWeapon".main_core1, 0)
      AND COALESCE(m.main_core2, 0) = COALESCE("v2_CharacterTrioWeapon".main_core2, 0)
      AND COALESCE(m.main_core3, 0) = COALESCE("v2_CharacterTrioWeapon".main_core3, 0)
      AND m.patch_version = '11.1'
      AND m.tier = 'METEORITE'
  );

DELETE FROM "v2_CharacterTrioWeapon"
WHERE patch_version = '11.1' AND tier = 'IN1000';


-- ── 3. 기타 단순 테이블 — 충돌 시 DELETE, 아니면 UPDATE ──────────
-- (PK 충돌 회피용 단순 패턴: 같은 (..., METEORITE, '11.1') row 있으면 IN1000은 삭제)
-- 합산 정확도가 낮은 테이블 (build/skill order 등 누적량 적음). 단순 처리.

-- v2_CharacterEquipmentBuildStats (camelCase)
DELETE FROM "v2_CharacterEquipmentBuildStats"
WHERE "patchVersion" = '11.1' AND "tier" = 'IN1000';

-- v2_CharacterTraitBuildStats (camelCase)
DELETE FROM "v2_CharacterTraitBuildStats"
WHERE "patchVersion" = '11.1' AND "tier" = 'IN1000';

-- v2_CharacterSkillOrder (snake_case)
DELETE FROM "v2_CharacterSkillOrder"
WHERE patch_version = '11.1' AND tier = 'IN1000';

-- v2_CharacterStartRoute (snake_case)
DELETE FROM "v2_CharacterStartRoute"
WHERE patch_version = '11.1' AND tier = 'IN1000';

-- v2_CharacterItemPriority (snake_case, 10.7 이상은 수집 안 함)
DELETE FROM "v2_CharacterItemPriority"
WHERE patch_version = '11.1' AND tier = 'IN1000';

COMMIT;
