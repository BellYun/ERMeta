import { Injectable } from '@nestjs/common';
import { PlayerHistoryDatabaseService } from '../../common/database/player-history-database.service';

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
  providerUid: string;
}

export interface StoredSeasonStats {
  stats: OfficialSeasonStats;
  fetchedAt: Date;
}

interface LookupRow {
  id: string;
  nickname: string;
  provider_uid: string;
}

@Injectable()
export class PlayerSeasonStatsRepository {
  constructor(private readonly database: PlayerHistoryDatabaseService) {}

  async findByNicknameKey(nicknameKey: string): Promise<PlayerLookup | null> {
    const result = await this.database.getPool().query<LookupRow>(
      `SELECT id, nickname, provider_uid
       FROM player_history.player_lookups WHERE nickname_key = $1`,
      [nicknameKey],
    );
    return result.rows[0] ? mapLookup(result.rows[0]) : null;
  }

  async findSnapshot(playerId: string, seasonId: number, matchingMode: number): Promise<StoredSeasonStats | null> {
    const result = await this.database.getPool().query<{
      stats_payload: OfficialSeasonStats;
      fetched_at: Date;
    }>(
      `SELECT stats_payload, fetched_at
       FROM player_history.player_season_stats
       WHERE player_lookup_id = $1 AND season_id = $2 AND matching_mode = $3
       ORDER BY fetched_at DESC, matching_team_mode DESC
       LIMIT 1`,
      [playerId, seasonId, matchingMode],
    );
    const row = result.rows[0];
    return row ? { stats: row.stats_payload, fetchedAt: row.fetched_at } : null;
  }

  async saveResult(
    nickname: string,
    nicknameKey: string,
    providerUid: string,
    seasonId: number,
    matchingMode: number,
    stats: OfficialSeasonStats | null,
    fetchedAt: Date,
  ): Promise<PlayerLookup> {
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [nicknameKey]);
      const previous = await client.query<LookupRow>(
        'SELECT id, provider_uid FROM player_history.player_lookups WHERE nickname_key = $1 FOR UPDATE',
        [nicknameKey],
      );
      const lookup = await client.query<LookupRow>(
        `INSERT INTO player_history.player_lookups
           (nickname, nickname_key, provider_uid, resolved_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (nickname_key) DO UPDATE SET
           nickname = EXCLUDED.nickname,
           provider_uid = EXCLUDED.provider_uid,
           resolved_at = EXCLUDED.resolved_at
         RETURNING id, nickname, provider_uid`,
        [nickname, nicknameKey, providerUid, fetchedAt],
      );
      const playerId = lookup.rows[0].id;

      if (previous.rows[0] && previous.rows[0].provider_uid !== providerUid) {
        await client.query(
          'DELETE FROM player_history.player_match_records WHERE player_lookup_id = $1',
          [playerId],
        );
        await client.query(
          'DELETE FROM player_history.player_season_stats WHERE player_lookup_id = $1',
          [playerId],
        );
        await client.query(
          'UPDATE player_history.player_lookups SET matches_synced_at = NULL WHERE id = $1',
          [playerId],
        );
      }

      await client.query(
        `DELETE FROM player_history.player_season_stats
         WHERE player_lookup_id = $1 AND season_id = $2 AND matching_mode = $3
           AND ($4::integer IS NULL OR matching_team_mode <> $4)`,
        [playerId, seasonId, matchingMode, stats?.matchingTeamMode ?? null],
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
          [playerId, seasonId, matchingMode, stats.matchingTeamMode,
            stats.totalGames, stats.totalWins, stats.averageRank, JSON.stringify(stats), fetchedAt],
        );
      }
      await client.query('COMMIT');
      return mapLookup(lookup.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

function mapLookup(row: LookupRow): PlayerLookup {
  return { id: row.id, nickname: row.nickname, providerUid: row.provider_uid };
}
