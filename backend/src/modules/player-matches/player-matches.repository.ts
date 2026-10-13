import { Injectable } from '@nestjs/common';
import { PlayerHistoryDatabaseService } from '../../common/database/player-history-database.service';

export interface PlayerLookup {
  id: string;
  nickname: string;
  providerUid: string;
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

interface LookupRow {
  id: string;
  nickname: string;
  provider_uid: string;
  matches_synced_at: Date | null;
}

@Injectable()
export class PlayerMatchesRepository {
  constructor(private readonly database: PlayerHistoryDatabaseService) {}

  async findByNicknameKey(nicknameKey: string): Promise<PlayerLookup | null> {
    const result = await this.database.getPool().query<LookupRow>(
      `SELECT id, nickname, provider_uid, matches_synced_at
       FROM player_history.player_lookups WHERE nickname_key = $1`,
      [nicknameKey],
    );
    return result.rows[0] ? mapLookup(result.rows[0]) : null;
  }

  async saveSnapshot(
    nickname: string,
    nicknameKey: string,
    providerUid: string,
    games: MatchSnapshot[],
    syncedAt: Date,
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
         RETURNING id, nickname, provider_uid, matches_synced_at`,
        [nickname, nicknameKey, providerUid, syncedAt],
      );
      const playerId = lookup.rows[0].id;

      // A nickname can point to a different temporary UID after a rename.
      if (previous.rows[0] && previous.rows[0].provider_uid !== providerUid) {
        await client.query(
          'DELETE FROM player_history.player_match_records WHERE player_lookup_id = $1',
          [playerId],
        );
        await client.query(
          'DELETE FROM player_history.player_season_stats WHERE player_lookup_id = $1',
          [playerId],
        );
      }

      for (const chunk of chunks(games, 100)) {
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
          game.rank, game.kills, game.assists,
        ]);
        await client.query(
          `INSERT INTO player_history.player_match_records
             (player_lookup_id, game_id, character_code, weapon_code, rank, kills, assists)
           VALUES ${placeholders(chunk.length, 7)}
           ON CONFLICT (player_lookup_id, game_id) DO UPDATE SET
             character_code = EXCLUDED.character_code,
             weapon_code = EXCLUDED.weapon_code,
             rank = EXCLUDED.rank,
             kills = EXCLUDED.kills,
             assists = EXCLUDED.assists`,
          recordValues,
        );
      }

      const updated = await client.query<LookupRow>(
        `UPDATE player_history.player_lookups SET matches_synced_at = $2
         WHERE id = $1 RETURNING id, nickname, provider_uid, matches_synced_at`,
        [playerId, syncedAt],
      );
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
    const result = await this.database.getPool().query<{
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
    }>(
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
      matches: result.rows.slice(0, limit).map((row) => ({
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
      })),
      hasMore: result.rows.length > limit,
    };
  }
}

function mapLookup(row: LookupRow): PlayerLookup {
  return {
    id: row.id,
    nickname: row.nickname,
    providerUid: row.provider_uid,
    matchesSyncedAt: row.matches_synced_at,
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
