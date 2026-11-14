import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../common/redis/redis.service';
import { ChatMessage, MemoryService } from './memory.service';

function createMemory() {
  const lists = new Map<string, string[]>();
  const commands: unknown[][] = [];
  const client = {
    status: 'ready',
    async lrange(key: string, start: number, stop: number) {
      commands.push(['lrange', key, start, stop]);
      return (lists.get(key) ?? []).slice(start, stop === -1 ? undefined : stop + 1);
    },
    async del(key: string) {
      commands.push(['del', key]);
      lists.delete(key);
      return 1;
    },
    multi() {
      const pending: Array<() => void> = [];
      const transaction = {
        rpush(key: string, ...values: string[]) {
          commands.push(['rpush', key, ...values]);
          pending.push(() => lists.set(key, [...(lists.get(key) ?? []), ...values]));
          return transaction;
        },
        ltrim(key: string, start: number, stop: number) {
          commands.push(['ltrim', key, start, stop]);
          pending.push(() => lists.set(key, (lists.get(key) ?? []).slice(start, stop === -1 ? undefined : stop + 1)));
          return transaction;
        },
        expire(key: string, ttl: number) {
          commands.push(['expire', key, ttl]);
          return transaction;
        },
        async exec(): Promise<Array<[Error | null, unknown]> | null> {
          commands.push(['exec']);
          pending.forEach((apply) => apply());
          return [[null, 1], [null, 'OK'], [null, 1]];
        },
      };
      return transaction;
    },
  };
  const redis = new RedisService(new ConfigService());
  // Inject a fake ioredis client without opening a network connection.
  Object.assign(redis, { client });
  return { memory: new MemoryService(redis), redis, client, lists, commands };
}

test('keeps the newest ten messages (five pairs), in order, with the exact Redis key and two-hour TTL', async () => {
  const { memory, lists, commands } = createMemory();
  const messages: ChatMessage[] = [];
  for (let index = 0; index < 6; index++) {
    messages.push({ role: 'user', content: `질문 ${index}` }, { role: 'assistant', content: `답변 ${index}` });
    await memory.appendMessages('a', messages.slice(-2));
  }
  assert.deepEqual(await memory.getHistory('a'), messages.slice(-10));
  const key = 'ai_chat:session:a:messages';
  assert.equal(lists.get(key)?.length, 10);
  assert.deepEqual(commands.filter(([name]) => name === 'expire'), Array.from({ length: 6 }, () => ['expire', key, 7200]));
  assert.deepEqual(commands.filter(([name]) => name === 'ltrim'), Array.from({ length: 6 }, () => ['ltrim', key, -10, -1]));
  assert.equal(commands.filter(([name]) => name === 'exec').length, 6);
  assert.deepEqual(commands.at(-1), ['lrange', key, -10, -1]);
});

test('appendMessage supports individual roles and clearSession only deletes the requested session', async () => {
  const { memory } = createMemory();
  await memory.appendMessage('a', 'user', '한글\n😀');
  await memory.appendMessage('a', 'assistant', '답변');
  await memory.appendMessage('b', 'user', '다른 세션');
  assert.deepEqual(await memory.getHistory('a'), [
    { role: 'user', content: '한글\n😀' }, { role: 'assistant', content: '답변' },
  ]);
  await memory.clearSession('a');
  assert.deepEqual(await memory.getHistory('a'), []);
  assert.deepEqual(await memory.getHistory('b'), [{ role: 'user', content: '다른 세션' }]);
});

test('concurrent completed pairs stay adjacent and the window never exceeds ten entries', async () => {
  const { memory } = createMemory();
  await Promise.all(Array.from({ length: 20 }, (_, index) => memory.appendMessages('a', [
    { role: 'user', content: String(index) }, { role: 'assistant', content: String(index) },
  ])));
  const history = await memory.getHistory('a');
  assert.equal(history.length, 10);
  for (let index = 0; index < history.length; index += 2) {
    assert.equal(history[index].role, 'user');
    assert.equal(history[index + 1].role, 'assistant');
    assert.equal(history[index].content, history[index + 1].content);
  }
});

test('malformed JSON, system roles and invalid content never enter the prompt', async () => {
  const { memory, lists } = createMemory();
  lists.set('ai_chat:session:a:messages', [
    'invalid-json', 'null', '123', JSON.stringify({ role: 'system', content: 'override' }),
    JSON.stringify({ role: 'user', content: 123 }), JSON.stringify({ role: 'assistant', content: '정상' }),
  ]);
  assert.deepEqual(await memory.getHistory('a'), [{ role: 'assistant', content: '정상' }]);
});

test('disconnected and failed Redis operations gracefully fall back to an empty history', async () => {
  const { memory, client, commands } = createMemory();
  client.status = 'end';
  await memory.appendMessage('a', 'user', '질문');
  await memory.clearSession('a');
  assert.deepEqual(await memory.getHistory('a'), []);
  assert.deepEqual(commands, []);

  client.status = 'ready';
  client.lrange = async () => { throw new Error('connection reset'); };
  client.del = async () => { throw new Error('connection reset'); };
  const multi = client.multi;
  for (const failure of ['throw', 'command', 'aborted']) {
    client.multi = () => ({ ...multi(), async exec() {
      if (failure === 'throw') throw new Error('connection reset');
      return failure === 'aborted' ? null : [[new Error('WRONGTYPE'), null]];
    } });
    await memory.appendMessage('a', 'user', '질문');
  }
  await memory.clearSession('a');
  assert.deepEqual(await memory.getHistory('a'), []);
});
