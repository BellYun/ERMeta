import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PlayerHistoryDatabaseService } from '../../common/database/player-history-database.service';

// Match the existing multi-search nickname-miss TTL.
const NICKNAME_ABSENCE_TTL_SECONDS = 5 * 60;

@Injectable()
export class PlayerNicknameAbsencesRepository {
  constructor(private readonly database: PlayerHistoryDatabaseService) {}

  async isMissing(nicknameKey: string): Promise<boolean> {
    const result = await this.database.getPool().query(
      `SELECT 1 FROM player_history.player_nickname_absences
       WHERE nickname_hash = $1 AND expires_at > statement_timestamp()`,
      [hashNickname(nicknameKey)],
    );
    return result.rowCount === 1;
  }

  async rememberMissing(nicknameKey: string): Promise<void> {
    // Remove a bounded batch of expired rows on writes, without a periodic job.
    await this.database.getPool().query(
      `WITH saved AS (
         INSERT INTO player_history.player_nickname_absences (nickname_hash, expires_at)
         VALUES ($1, statement_timestamp() + $2 * interval '1 second')
         ON CONFLICT (nickname_hash) DO UPDATE SET expires_at = EXCLUDED.expires_at
         RETURNING nickname_hash
       ), expired AS (
         SELECT entry.nickname_hash
         FROM player_history.player_nickname_absences entry
         JOIN saved ON entry.nickname_hash <> saved.nickname_hash
         WHERE entry.expires_at <= statement_timestamp()
         ORDER BY entry.expires_at
         LIMIT 32 FOR UPDATE OF entry SKIP LOCKED
       )
       DELETE FROM player_history.player_nickname_absences entry
       USING expired WHERE entry.nickname_hash = expired.nickname_hash`,
      [hashNickname(nicknameKey), NICKNAME_ABSENCE_TTL_SECONDS],
    );
  }
}

function hashNickname(nicknameKey: string): Buffer {
  return createHash('sha256').update(nicknameKey).digest();
}
