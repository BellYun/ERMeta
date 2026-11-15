import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SupabaseService } from '../../../common/database/supabase.service';
import { ChatMetrics, MetricsService } from './metrics.service';

const input: ChatMetrics = {
  sessionId: '8c2695b2-e3fb-4c68-bb39-cc891760c650', nickname: '테스터',
  provider: 'gemini', model: 'gemini-2.0-flash', promptTokens: 150, completionTokens: 20,
  ttftMs: 80, totalDurationMs: 300, flaggedModeration: false,
};
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function createMetrics(result: () => Promise<{ error: unknown }> = async () => ({ error: null })) {
  const queries: unknown[][] = [];
  const client = {
    from(table: string) {
      const query = {
        upsert(value: unknown, options: unknown) { queries.push([table, 'upsert', value, options]); return query; },
        insert(value: unknown) { queries.push([table, 'insert', value]); return query; },
        abortSignal(signal: AbortSignal) {
          assert.ok(signal instanceof AbortSignal);
          return result();
        },
      };
      return query;
    },
  };
  const metrics = new MetricsService({ getClient: () => client } as unknown as SupabaseService);
  return { metrics, queries };
}

test('persists the FK parent without a read, then inserts exactly one metrics row', async () => {
  const { metrics, queries } = createMetrics();
  assert.equal(metrics.record(input), undefined);
  await flush();
  assert.deepEqual(queries, [
    ['ai_chat_sessions', 'upsert', { id: input.sessionId }, { onConflict: 'id', ignoreDuplicates: true }],
    ['ai_chat_metrics', 'insert', {
      session_id: input.sessionId, nickname: '테스터', provider: 'gemini', model: 'gemini-2.0-flash',
      prompt_tokens: 150, completion_tokens: 20, ttft_ms: 80, total_duration_ms: 300, flagged_moderation: false,
    }],
  ]);
});

test('record returns while the database is unresolved, then safely catches a late rejection', async () => {
  let reject!: (reason: Error) => void;
  const pending = new Promise<never>((_, fail) => { reject = fail; });
  const { metrics, queries } = createMetrics(() => pending);
  assert.equal(metrics.record(input), undefined);
  assert.equal(queries.length, 1);
  await flush();
  assert.equal(queries.length, 1, 'no insert until the FK parent write finishes');
  reject(new Error('database disconnected'));
  await flush(); // An unhandled rejection would fail node:test.
  assert.equal(queries.length, 1);
});

test('connection exceptions, session errors and Supabase insert error results never escape record', async () => {
  const unavailable = new MetricsService({ getClient() { throw new Error('secret-key'); } } as unknown as SupabaseService);
  assert.doesNotThrow(() => unavailable.record(input));
  const sessionFailure = createMetrics(async () => ({ error: new Error('FK parent failure') }));
  sessionFailure.metrics.record(input);
  const insertFailure = createMetrics(async () => ({ error: new Error('insert failed') }));
  insertFailure.metrics.record({ ...input, sessionId: undefined });
  const rejected = createMetrics(async () => { throw new Error('network failure'); });
  rejected.metrics.record({ ...input, sessionId: undefined });
  await flush();
  assert.equal(sessionFailure.queries.length, 1);
  assert.equal(insertFailure.queries.length, 1);
  assert.equal(rejected.queries.length, 1);
});

test('blocked turns preserve moderation flags and NULL TTFT without saving any conversation content', async () => {
  const { metrics, queries } = createMetrics();
  metrics.record({ ...input, sessionId: undefined, nickname: undefined, promptTokens: 0,
    completionTokens: 0, ttftMs: null, flaggedModeration: true });
  await flush();
  assert.equal(queries.length, 1);
  const row = queries[0][2] as Record<string, unknown>;
  assert.equal(row.session_id, null);
  assert.equal(row.nickname, null);
  assert.equal(row.ttft_ms, null);
  assert.equal(row.flagged_moderation, true);
  assert.equal(row.completion_tokens, 0);
  assert.ok(!('message' in row));
});

test('token estimates include UTF-8 Korean/emoji bytes and do not depend on chunk boundaries', () => {
  const { metrics } = createMetrics();
  assert.equal(metrics.estimateTokens(''), 0);
  assert.equal(metrics.estimateTokens('abcd'), 1);
  assert.equal(metrics.estimateTokens('abcde'), 2);
  assert.equal(metrics.estimateTokens('가😀'), 2);
});
