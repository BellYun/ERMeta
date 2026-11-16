import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { RedisService } from '../../../common/redis/redis.service';
import { DAILY_TURN_LIMIT, QuotaService } from './quota.service';

test('quota shares a UTC date key, allows 30 attempts, and rejects excess attempts with HTTP 429', async (context) => {
  context.mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 10, 15, 23, 59, 50) });
  const counts = new Map<string, number>();
  const calls: unknown[][] = [];
  const redis = {
    async consumeQuota(key: string, limit: number, ttl: number) {
      calls.push([key, limit, ttl]);
      const count = counts.get(key) ?? 0;
      if (count >= limit) return false;
      counts.set(key, count + 1);
      return true;
    },
  };
  const first = new QuotaService(redis as unknown as RedisService);
  const second = new QuotaService(redis as unknown as RedisService);
  const results = await Promise.allSettled(Array.from({ length: 40 }, (_, index) =>
    (index % 2 ? first : second).consume('ip:127.0.0.1')));
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 30);
  for (const result of results) {
    if (result.status === 'rejected') {
      assert.ok(result.reason instanceof HttpException);
      assert.equal(result.reason.getStatus(), 429);
      const body = result.reason.getResponse();
      assert.equal(typeof body, 'object');
      assert.equal((body as { retryAfter: number }).retryAfter, 10);
      assert.match(result.reason.message, /30턴/);
    }
  }
  assert.deepEqual(calls[0], ['ai_chat:quota:ip:127.0.0.1:2026-11-15', DAILY_TURN_LIMIT, 10]);
  await first.consume('ip:127.0.0.2');
  context.mock.timers.tick(10_000);
  await first.consume('ip:127.0.0.1');
  assert.deepEqual(calls.at(-1), ['ai_chat:quota:ip:127.0.0.1:2026-11-16', 30, 86400]);
});

test('quota fails closed with HTTP 503 when Redis cannot confirm the budget', async () => {
  const quota = new QuotaService({ async consumeQuota() { return null; } } as unknown as RedisService);
  await assert.rejects(quota.consume('ip:a'), (error: HttpException) => error.getStatus() === 503);
});

test('Redis uses one atomic EVAL per quota attempt with the limit and expiry, and returns its decision', async () => {
  const calls: unknown[][] = [];
  const client = {
    status: 'ready',
    async eval(...args: unknown[]) { calls.push(args); return 1; },
  };
  const redis = new RedisService(new ConfigService());
  Object.assign(redis, { client });
  assert.equal(await redis.consumeQuota('quota:a', 30, 100), true);
  assert.equal(calls.length, 1);
  const [script, ...args] = calls[0];
  assert.deepEqual(args, [1, 'quota:a', 30, 100]);
  assert.match(script as string, /redis\.call\('INCR'/);
  assert.match(script as string, /redis\.call\('EXPIRE'/);
  client.eval = async () => 0;
  assert.equal(await redis.consumeQuota('quota:a', 30, 100), false);
  client.eval = async () => 2;
  assert.equal(await redis.consumeQuota('quota:a', 30, 100), null);
});

test('Redis disconnection, command failure and timeout return unknown instead of allowing unmetered calls', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const redis = new RedisService(new ConfigService());
  const client = { status: 'end', async eval(): Promise<number> { throw new Error('unavailable'); } };
  Object.assign(redis, { client });
  assert.equal(await redis.consumeQuota('quota:a', 30, 100), null);
  client.status = 'ready';
  assert.equal(await redis.consumeQuota('quota:a', 30, 100), null);
  client.eval = () => new Promise<number>(() => {});
  const pending = redis.consumeQuota('quota:a', 30, 100);
  context.mock.timers.tick(1000);
  assert.equal(await pending, null);
});
