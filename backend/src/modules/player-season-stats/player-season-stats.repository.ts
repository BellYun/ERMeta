import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PoolClient } from 'pg';
import { PlayerHistoryDatabaseService } from '../../common/database/player-history-database.service';
import { checkPlayerWork } from '../../common/player-work/player-work';

// Allow the two BSER operations to use the existing queue and request timeouts.
const REFRESH_LEASE_SECONDS = 60;

export interface OfficialCharacterStats {
  characterCode: number;
  totalGames: number;
  wins: number;
  top3Rate: number;
  averageRank: number;
}

export interface OfficialSeasonStats {
  seasonId: number;
  matchingMode: number;
  matchingTeamMode: number;
  totalGames: number;
  totalWins: number;
  winRate: number;
  averageRank: number;
  mmr: number | null;
  rank: number | null;
  rankSize: number | null;
  rankPercent: number | null;
  top3Rate: number | null;
  averageKills: number | null;
  averageAssistants: number | null;
  characterStats: OfficialCharacterStats[];
}

export interface PlayerLookup {
  id: string;
  nickname: string;
}

export interface StoredSeasonResult {
  stats: OfficialSeasonStats | null;
  fetchedAt: Date;
}

interface StoredSeasonStats extends StoredSeasonResult {
  stats: OfficialSeasonStats;
}

interface LookupRow {
  id: string;
  nickname: string;
}

export interface SeasonStatsScope {
  nicknameKey: string;
  seasonId: number;
  matchingMode: number;
}

export type SeasonStatsFailure = 'rate_limited' | 'unavailable';

type RefreshClaim =
  | { status: 'acquired'; token: string }
  | { status: 'busy' }
  | { status: 'backoff'; failure: SeasonStatsFailure; retryAfter: number };

export class SeasonStatsRefreshLeaseLostError extends Error {
  constructor() {
    super('Season stats refresh lease lost');
  }
}

@Injectable()
export class PlayerSeasonStatsRepository {
  constructor(private readonly database: PlayerHistoryDatabaseService) {}

  async findByNicknameKey(nicknameKey: string): Promise<PlayerLookup | null> {
    const result = await this.database.getPool().query<LookupRow>(
      `SELECT id, nickname
       FROM player_history.player_lookups WHERE nickname_key = $1`,
      [nicknameKey],
    );
    return result.rows[0] ? mapLookup(result.rows[0]) : null;
  }

  async findSnapshot(playerId: string, seasonId: number, matchingMode: number): Promise<StoredSeasonResult | null> {
    const result = await this.database.getPool().query<{
      stats_payload: OfficialSeasonStats | null;
      fetched_at: Date;
    }>(
      `SELECT stats_payload, fetched_at
       FROM (
         SELECT stats_payload, fetched_at, matching_team_mode
         FROM player_history.player_season_stats
         WHERE player_lookup_id = $1 AND season_id = $2 AND matching_mode = $3
         UNION ALL
         SELECT NULL::jsonb AS stats_payload, fetched_at, 0 AS matching_team_mode
         FROM player_history.player_season_stats_absences
         WHERE player_lookup_id = $1 AND season_id = $2 AND matching_mode = $3
       ) AS result
       ORDER BY fetched_at DESC, matching_team_mode DESC
       LIMIT 1`,
      [playerId, seasonId, matchingMode],
    );
    const row = result.rows[0];
    return row ? { stats: row.stats_payload, fetchedAt: row.fetched_at } : null;
  }

  async findLatestRankedSnapshot(playerId: string): Promise<StoredSeasonStats | null> {
    const result = await this.database.getPool().query<{
      stats_payload: OfficialSeasonStats;
      fetched_at: Date;
    }>(
      `SELECT stats_payload, fetched_at
       FROM player_history.player_season_stats
       WHERE player_lookup_id = $1 AND matching_mode = 3
       ORDER BY season_id DESC, fetched_at DESC, matching_team_mode DESC
       LIMIT 1`,
      [playerId],
    );
    const row = result.rows[0];
    return row ? { stats: row.stats_payload, fetchedAt: row.fetched_at } : null;
  }

  async claimRefresh(scope: SeasonStatsScope): Promise<RefreshClaim> {
    const pool = this.database.getPool();
    const key = refreshKey(scope);
    const token = randomUUID();
    const claimed = await pool.query(
      `INSERT INTO player_history.season_stats_refresh_states AS held
         (nickname_key, season_id, matching_mode, lease_token, lease_until)
       VALUES ($1, $2, $3, $4, clock_timestamp() + $5 * interval '1 second')
       ON CONFLICT (nickname_key, season_id, matching_mode) DO UPDATE SET
         lease_token = EXCLUDED.lease_token,
         lease_until = clock_timestamp() + $5 * interval '1 second'
       WHERE (held.lease_until IS NULL OR held.lease_until <= clock_timestamp())
         AND (held.retry_at IS NULL OR held.retry_at <= clock_timestamp())
       RETURNING lease_token`,
      [...key, token, REFRESH_LEASE_SECONDS],
    );
    if (claimed.rowCount === 1) return { status: 'acquired', token };

    const { rows: [failure] } = await pool.query<{ failure_code: SeasonStatsFailure; retry_after: number }>(
      `SELECT failure_code, GREATEST(1, CEIL(EXTRACT(EPOCH FROM retry_at - clock_timestamp())))::integer AS retry_after
       FROM player_history.season_stats_refresh_states
       WHERE nickname_key = $1 AND season_id = $2 AND matching_mode = $3 AND retry_at > clock_timestamp()`,
      key,
    );
    return failure
      ? { status: 'backoff', failure: failure.failure_code, retryAfter: failure.retry_after }
      : { status: 'busy' };
  }

  async recordRefreshFailure(scope: SeasonStatsScope, token: string, failure: SeasonStatsFailure,
    providerRetryAfter = 0): Promise<number | null> {
    const minimumDelay = Number.isFinite(providerRetryAfter)
      ? Math.min(86_400, Math.max(0, Math.ceil(providerRetryAfter))) : 0;
    const { rows: [result] } = await this.database.getPool().query<{ retry_after: number }>(
      `UPDATE player_history.season_stats_refresh_states
       SET lease_token = NULL, lease_until = NULL, failure_code = $5,
           failure_count = LEAST(failure_count + 1, 5),
           retry_at = clock_timestamp() + GREATEST($6, LEAST(30, power(2, failure_count))) * interval '1 second'
       WHERE nickname_key = $1 AND season_id = $2 AND matching_mode = $3
         AND lease_token = $4 AND lease_until > clock_timestamp()
       RETURNING GREATEST(1, CEIL(EXTRACT(EPOCH FROM retry_at - clock_timestamp())))::integer AS retry_after`,
      [...refreshKey(scope), token, failure, minimumDelay],
    );
    return result?.retry_after ?? null;
  }

  async releaseRefresh(scope: SeasonStatsScope, token: string): Promise<void> {
    await this.database.getPool().query(
      `DELETE FROM player_history.season_stats_refresh_states
       WHERE nickname_key = $1 AND season_id = $2 AND matching_mode = $3 AND lease_token = $4`,
      [...refreshKey(scope), token],
    );
  }

  async saveResult(
    nickname: string,
    nicknameKey: string,
    seasonId: number,
    matchingMode: number,
    stats: OfficialSeasonStats | null,
    fetchedAt: Date,
    leaseToken?: string,
  ): Promise<PlayerLookup> {
    const scope = { nicknameKey, seasonId, matchingMode };
    checkPlayerWork();
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      checkPlayerWork();
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [nicknameKey]);
      if (leaseToken) {
        const held = await client.query(
          `SELECT lease_token FROM player_history.season_stats_refresh_states
           WHERE nickname_key = $1 AND season_id = $2 AND matching_mode = $3
             AND lease_token = $4 AND lease_until > clock_timestamp()
           FOR UPDATE`,
          [...refreshKey(scope), leaseToken],
        );
        if (held.rowCount !== 1) throw new SeasonStatsRefreshLeaseLostError();
      }
      checkPlayerWork();
      const lookup = await client.query<LookupRow>(
        `INSERT INTO player_history.player_lookups
           (nickname, nickname_key, resolved_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (nickname_key) DO UPDATE SET
           nickname = CASE WHEN EXCLUDED.resolved_at >= player_lookups.resolved_at
             THEN EXCLUDED.nickname ELSE player_lookups.nickname END,
           resolved_at = GREATEST(EXCLUDED.resolved_at, player_lookups.resolved_at)
         RETURNING id, nickname`,
        [nickname, nicknameKey, fetchedAt],
      );
      const playerId = lookup.rows[0].id;
      const key = [playerId, seasonId, matchingMode];
      // The advisory lock serializes writers. Compare timestamps before replacing either result.
      const { rows: [state] } = await client.query<{ has_newer: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM player_history.player_season_stats
           WHERE player_lookup_id = $1 AND season_id = $2 AND matching_mode = $3 AND fetched_at > $4
           UNION ALL
           SELECT 1 FROM player_history.player_season_stats_absences
           WHERE player_lookup_id = $1 AND season_id = $2 AND matching_mode = $3 AND fetched_at > $4
         ) AS has_newer`,
        [...key, fetchedAt],
      );
      if (state.has_newer) {
        if (leaseToken) await this.finishRefresh(client, scope, leaseToken);
        checkPlayerWork();
        await client.query('COMMIT');
        return mapLookup(lookup.rows[0]);
      }

      checkPlayerWork();
      await client.query(
        `DELETE FROM player_history.player_season_stats
         WHERE player_lookup_id = $1 AND season_id = $2 AND matching_mode = $3
           AND ($4::integer IS NULL OR matching_team_mode <> $4)`,
        [...key, stats?.matchingTeamMode ?? null],
      );
      if (stats) {
        await client.query(
          `INSERT INTO player_history.player_season_stats
             (player_lookup_id, season_id, matching_mode, matching_team_mode,
              total_games, wins, average_rank, stats_payload, fetched_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
           ON CONFLICT (player_lookup_id, season_id, matching_mode, matching_team_mode)
           DO UPDATE SET
             total_games = EXCLUDED.total_games,
             wins = EXCLUDED.wins,
             average_rank = EXCLUDED.average_rank,
             stats_payload = EXCLUDED.stats_payload,
             fetched_at = EXCLUDED.fetched_at`,
          [...key, stats.matchingTeamMode,
            stats.totalGames, stats.totalWins, stats.averageRank, JSON.stringify(stats), fetchedAt],
        );
        await client.query(
          `DELETE FROM player_history.player_season_stats_absences
           WHERE player_lookup_id = $1 AND season_id = $2 AND matching_mode = $3`,
          key,
        );
      } else {
        await client.query(
          `INSERT INTO player_history.player_season_stats_absences
             (player_lookup_id, season_id, matching_mode, fetched_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (player_lookup_id, season_id, matching_mode)
           DO UPDATE SET fetched_at = EXCLUDED.fetched_at`,
          [...key, fetchedAt],
        );
      }
      if (leaseToken) await this.finishRefresh(client, scope, leaseToken);
      checkPlayerWork();
      await client.query('COMMIT');
      return mapLookup(lookup.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async finishRefresh(client: PoolClient, scope: SeasonStatsScope, token: string): Promise<void> {
    const result = await client.query(
      `DELETE FROM player_history.season_stats_refresh_states
       WHERE nickname_key = $1 AND season_id = $2 AND matching_mode = $3
         AND lease_token = $4 AND lease_until > clock_timestamp()`,
      [...refreshKey(scope), token],
    );
    if (result.rowCount !== 1) throw new SeasonStatsRefreshLeaseLostError();
  }
}

function refreshKey(scope: SeasonStatsScope) {
  return [scope.nicknameKey, scope.seasonId, scope.matchingMode];
}

function mapLookup(row: LookupRow): PlayerLookup {
  return { id: row.id, nickname: row.nickname };
}
