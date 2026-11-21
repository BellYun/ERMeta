import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PlayerHistoryDatabaseService } from '../../common/database/player-history-database.service';
import { checkPlayerWork } from '../../common/player-work/player-work';

// Allows both BSER calls to use the existing queue and retry timeouts before a lease expires.
const MATCH_REFRESH_LEASE_SECONDS = 60;

export interface PlayerLookup {
  id: string;
  nickname: string;
  matchesSyncedAt: Date | null;
}

export interface MatchSnapshot {
  gameId: number;
  seasonId: number;
  matchingMode: number;
  matchingTeamMode: number;
  startedAt: Date;
  characterCode: number;
  weaponCode: number;
  rank: number;
  kills: number;
  assists: number;
  details?: StoredMatchDetails | null;
}

export interface StoredMatchDetails {
  equipment?: Record<string, number>;
  characterLevel?: number;
  damageToPlayer?: number;
  duration?: number;
  mmrBefore?: number;
  mmrAfter?: number;
  mmrGain?: number;
  routeIdOfStart?: number;
}

export interface MatchCursor {
  startedAt: Date;
  gameId: string;
}

export interface StoredMatch {
  gameId: string;
  seasonId: number;
  matchingMode: number;
  matchingTeamMode: number;
  startedAt: Date;
  characterCode: number;
  weaponCode: number;
  rank: number;
  kills: number;
  assists: number;
}

interface StoredMatchDetail {
  nickname: string;
  match: StoredMatch;
  details: StoredMatchDetails | null;
}

export interface StoredMatchAggregate {
  sampleSize: number;
  wins: number;
  top3: number;
  averageRank: number | null;
  averageKills: number | null;
  averageAssists: number | null;
  periodStart: Date | null;
  periodEnd: Date | null;
}

interface LookupRow {
  id: string;
  nickname: string;
  matches_synced_at: Date | null;
}

interface MatchRow {
  game_id: string;
  season_id: number;
  matching_mode: number;
  matching_team_mode: number;
  started_at: Date;
  character_code: number;
  weapon_code: number;
  rank: number;
  kills: number;
  assists: number;
}

export class MatchRefreshLeaseLostError extends Error {
  constructor() {
    super('Match refresh lease lost');
  }
}

@Injectable()
export class PlayerMatchesRepository {
  constructor(private readonly database: PlayerHistoryDatabaseService) {}

  async findByNicknameKey(nicknameKey: string): Promise<PlayerLookup | null> {
    const result = await this.database.getPool().query<LookupRow>(
      `SELECT id, nickname, matches_synced_at
       FROM player_history.player_lookups WHERE nickname_key = $1`,
      [nicknameKey],
    );
    return result.rows[0] ? mapLookup(result.rows[0]) : null;
  }

  async claimRefresh(nicknameKey: string): Promise<string | null> {
    const lease = randomUUID();
    const result = await this.database.getPool().query(
      `INSERT INTO player_history.match_refresh_leases AS held (nickname_key, lease_token, lease_until)
       VALUES ($1, $2, clock_timestamp() + $3 * interval '1 second')
       ON CONFLICT (nickname_key) DO UPDATE SET
         lease_token = EXCLUDED.lease_token,
         lease_until = clock_timestamp() + $3 * interval '1 second'
       WHERE held.lease_until <= clock_timestamp()
       RETURNING lease_token`,
      [nicknameKey, lease, MATCH_REFRESH_LEASE_SECONDS],
    );
    return result.rowCount === 1 ? lease : null;
  }

  async releaseRefresh(nicknameKey: string, lease: string): Promise<void> {
    await this.database.getPool().query(
      `DELETE FROM player_history.match_refresh_leases
       WHERE nickname_key = $1 AND lease_token = $2`,
      [nicknameKey, lease],
    );
  }

  async saveSnapshot(
    nickname: string,
    nicknameKey: string,
    games: MatchSnapshot[],
    syncedAt: Date,
    lease?: string,
  ): Promise<PlayerLookup> {
    checkPlayerWork();
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      checkPlayerWork();
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [nicknameKey]);
      if (lease) {
        const result = await client.query(
          `SELECT nickname_key FROM player_history.match_refresh_leases
           WHERE nickname_key = $1 AND lease_token = $2 AND lease_until > clock_timestamp()
           FOR UPDATE`,
          [nicknameKey, lease],
        );
        if (result.rowCount !== 1) throw new MatchRefreshLeaseLostError();
      }
      checkPlayerWork();
      const lookup = await client.query<LookupRow>(
        `INSERT INTO player_history.player_lookups
           (nickname, nickname_key, resolved_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (nickname_key) DO UPDATE SET
           nickname = EXCLUDED.nickname,
           resolved_at = EXCLUDED.resolved_at
         RETURNING id, nickname, matches_synced_at`,
        [nickname, nicknameKey, syncedAt],
      );
      const playerId = lookup.rows[0].id;

      for (const chunk of chunks(games, 100)) {
        checkPlayerWork();
        const matchValues = chunk.flatMap((game) => [
          game.gameId, game.seasonId, game.matchingMode,
          game.matchingTeamMode, game.startedAt,
        ]);
        await client.query(
          `INSERT INTO player_history.matches
             (game_id, season_id, matching_mode, matching_team_mode, started_at)
           VALUES ${placeholders(chunk.length, 5)}
           ON CONFLICT (game_id) DO UPDATE SET
             season_id = EXCLUDED.season_id,
             matching_mode = EXCLUDED.matching_mode,
             matching_team_mode = EXCLUDED.matching_team_mode,
             started_at = EXCLUDED.started_at`,
          matchValues,
        );

        const recordValues = chunk.flatMap((game) => [
          playerId, game.gameId, game.characterCode, game.weaponCode,
          game.rank, game.kills, game.assists, game.details ?? null,
        ]);
        await client.query(
          `INSERT INTO player_history.player_match_records AS existing
             (player_lookup_id, game_id, character_code, weapon_code, rank, kills, assists, details)
           VALUES ${placeholders(chunk.length, 8)}
           ON CONFLICT (player_lookup_id, game_id) DO UPDATE SET
             character_code = EXCLUDED.character_code,
             weapon_code = EXCLUDED.weapon_code,
             rank = EXCLUDED.rank,
             kills = EXCLUDED.kills,
             assists = EXCLUDED.assists,
             details = COALESCE(existing.details || EXCLUDED.details, EXCLUDED.details, existing.details)`,
          recordValues,
        );
      }

      checkPlayerWork();
      const updated = await client.query<LookupRow>(
        `UPDATE player_history.player_lookups SET matches_synced_at = $2
         WHERE id = $1 RETURNING id, nickname, matches_synced_at`,
        [playerId, syncedAt],
      );
      if (lease) {
        const result = await client.query(
          `DELETE FROM player_history.match_refresh_leases
           WHERE nickname_key = $1 AND lease_token = $2 AND lease_until > clock_timestamp()`,
          [nicknameKey, lease],
        );
        if (result.rowCount !== 1) throw new MatchRefreshLeaseLostError();
      }
      checkPlayerWork();
      await client.query('COMMIT');
      return mapLookup(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listMatches(
    playerId: string,
    limit: number,
    cursor: MatchCursor | null,
  ): Promise<{ matches: StoredMatch[]; hasMore: boolean }> {
    const result = await this.database.getPool().query<MatchRow>(
      `SELECT m.game_id, m.season_id, m.matching_mode, m.matching_team_mode,
              m.started_at, r.character_code, r.weapon_code, r.rank, r.kills, r.assists
       FROM player_history.player_match_records r
       JOIN player_history.matches m ON m.game_id = r.game_id
       WHERE r.player_lookup_id = $1
         AND ($2::timestamptz IS NULL OR (m.started_at, m.game_id) < ($2::timestamptz, $3::bigint))
       ORDER BY m.started_at DESC, m.game_id DESC
       LIMIT $4`,
      [playerId, cursor?.startedAt ?? null, cursor?.gameId ?? null, limit + 1],
    );
    return {
      matches: result.rows.slice(0, limit).map(mapMatch),
      hasMore: result.rows.length > limit,
    };
  }

  async findMatchByNicknameKey(nicknameKey: string, gameId: string): Promise<StoredMatchDetail | null> {
    const { rows } = await this.database.getPool().query<MatchRow & {
      nickname: string;
      details: StoredMatchDetails | null;
    }>(
      `SELECT m.game_id, m.season_id, m.matching_mode, m.matching_team_mode,
              m.started_at, r.character_code, r.weapon_code, r.rank, r.kills, r.assists,
              p.nickname, r.details
       FROM player_history.player_lookups p
       JOIN player_history.player_match_records r ON r.player_lookup_id = p.id
       JOIN player_history.matches m ON m.game_id = r.game_id
       WHERE p.nickname_key = $1 AND r.game_id = $2`,
      [nicknameKey, gameId],
    );
    const row = rows[0];
    if (!row) return null;
    return { nickname: row.nickname, match: mapMatch(row), details: row.details };
  }

  async aggregateMatches(playerId: string, seasonId: number, matchingMode: number): Promise<StoredMatchAggregate> {
    const result = await this.database.getPool().query<{
      sample_size: number;
      wins: number;
      top3: number;
      average_rank: number | null;
      average_kills: number | null;
      average_assists: number | null;
      period_start: Date | null;
      period_end: Date | null;
    }>(
      `SELECT COUNT(*)::integer AS sample_size,
              COUNT(*) FILTER (WHERE r.rank = 1)::integer AS wins,
              COUNT(*) FILTER (WHERE r.rank <= 3)::integer AS top3,
              AVG(r.rank)::double precision AS average_rank,
              AVG(r.kills)::double precision AS average_kills,
              AVG(r.assists)::double precision AS average_assists,
              MIN(m.started_at) AS period_start,
              MAX(m.started_at) AS period_end
       FROM player_history.player_match_records r
       JOIN player_history.matches m ON m.game_id = r.game_id
       WHERE r.player_lookup_id = $1 AND m.season_id = $2 AND m.matching_mode = $3`,
      [playerId, seasonId, matchingMode],
    );
    const row = result.rows[0];
    return {
      sampleSize: row.sample_size,
      wins: row.wins,
      top3: row.top3,
      averageRank: row.average_rank,
      averageKills: row.average_kills,
      averageAssists: row.average_assists,
      periodStart: row.period_start,
      periodEnd: row.period_end,
    };
  }
}

function mapLookup(row: LookupRow): PlayerLookup {
  return {
    id: row.id,
    nickname: row.nickname,
    matchesSyncedAt: row.matches_synced_at,
  };
}

function mapMatch(row: MatchRow): StoredMatch {
  return {
    gameId: row.game_id,
    seasonId: row.season_id,
    matchingMode: row.matching_mode,
    matchingTeamMode: row.matching_team_mode,
    startedAt: row.started_at,
    characterCode: row.character_code,
    weaponCode: row.weapon_code,
    rank: row.rank,
    kills: row.kills,
    assists: row.assists,
  };
}

function placeholders(rowCount: number, columnCount: number): string {
  return Array.from({ length: rowCount }, (_, row) =>
    `(${Array.from({ length: columnCount }, (_, column) => `$${row * columnCount + column + 1}`).join(', ')})`,
  ).join(', ');
}

function* chunks<T>(values: T[], size: number): Generator<T[]> {
  for (let index = 0; index < values.length; index += size) {
    yield values.slice(index, index + size);
  }
}
