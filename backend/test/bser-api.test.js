const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const test = require('node:test');
const { BserApiService } = require('../dist/modules/collect/bser-api.service');
const { playerWork } = require('../dist/common/player-work/player-work');

const REQUEST_TIMEOUT_MS = 500;
const SLOW_BODY_MS = REQUEST_TIMEOUT_MS * 3;

async function withServer(handler, overrides, run) {
  const originalFetch = global.fetch;
  const server = createServer(handler);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const api = new BserApiService({
    get: (key, fallback) => ({
      BSER_API_KEY: 'test-key',
      BSER_API_RATE_LIMIT_RPS: 0,
      BSER_API_TIMEOUT_MS: REQUEST_TIMEOUT_MS,
      BSER_API_RETRIES: 0,
      ...overrides,
    })[key] ?? fallback,
  });
  global.fetch = (input, init) => {
    const url = new URL(input);
    return originalFetch(new URL(`${url.pathname}${url.search}`, origin), init);
  };
  try {
    await run(api);
  } finally {
    global.fetch = originalFetch;
    api.onModuleDestroy();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

function delayedJson(response, body, delayMs) {
  response.writeHead(200, { 'content-type': 'application/json' });
  response.flushHeaders();
  const timer = setTimeout(() => response.end(JSON.stringify(body)), delayMs);
  response.once('close', () => clearTimeout(timer));
}

test('BSER timeout covers delayed bodies for player and collector requests', async (t) => {
  const cases = [
    ['nickname', (api) => api.findUserByNicknameDetailed('Alpha'),
      { code: 200, user: { uid: 'uid', nickname: 'Alpha' } }, 'unavailable'],
    ['matches', (api) => api.fetchUserMatchesDetailed('uid'),
      { code: 200, userGames: [] }, 'unavailable'],
    ['season stats', (api) => api.fetchUserStatsDetailed('uid', 41, 3),
      { code: 200, userStats: [{ totalGames: 1 }] }, 'unavailable'],
    ['game collector', (api) => api.fetchGame(1),
      { code: 200, userGames: [] }, null],
    ['rank collector', (api) => api.fetchRankTop(41, 3),
      { topRanks: Array.from({ length: 1000 }, () => ({ mmr: 10 })) }, null],
  ];
  for (const [name, call, body, expected] of cases) {
    await t.test(name, async () => {
      let requests = 0;
      await withServer((_request, response) => {
        requests += 1;
        delayedJson(response, body, SLOW_BODY_MS);
      }, {}, async (api) => {
        const result = await call(api);
        if (expected === null) assert.equal(result, null);
        else assert.equal(result.status, expected);
        assert.equal(requests, 1);
      });
    });
  }
});

test('a complete body within the timeout still normalizes the official UID', async () => {
  await withServer((_request, response) => {
    delayedJson(response, { code: 200, user: { uid: 'uid', nickname: 'Alpha' } }, 5);
  }, { BSER_API_TIMEOUT_MS: 500 }, async (api) => {
    assert.deepEqual(await api.findUserByNicknameDetailed('Alpha'), {
      status: 'found', user: { userId: 'uid', nickname: 'Alpha' },
    });
  });
});

test('season stats separate confirmed absence from invalid responses and throttling', async () => {
  let status = 200;
  let body;
  await withServer((_request, response) => {
    response.writeHead(status, { 'content-type': 'application/json', 'retry-after': '7' });
    response.end(JSON.stringify(body));
  }, {}, async (api) => {
    const fetchStats = () => api.fetchUserStatsDetailed('uid', 41, 3);
    for (const absent of [{ code: 404 }, { code: 200, userStats: [] }]) {
      body = absent;
      assert.deepEqual(await fetchStats(), { status: 'not_found' });
    }
    for (const invalid of [null, { code: 503 }, { code: 200 }, { code: 200, userStats: [null] }]) {
      body = invalid;
      assert.equal((await fetchStats()).status, 'unavailable');
    }
    body = { code: 429 };
    assert.deepEqual(await fetchStats(), { status: 'unavailable', statusCode: 429, retryAfter: 7 });
    status = 404;
    body = { message: 'Not Found' };
    assert.deepEqual(await fetchStats(), { status: 'not_found' });
  });
});

test('retrying a 5xx cancels its unread body before the next attempt', async () => {
  let requests = 0;
  let firstBodyClosed = false;
  await withServer((_request, response) => {
    requests += 1;
    if (requests === 1) {
      response.writeHead(503, { 'content-type': 'application/json' });
      response.flushHeaders();
      response.once('close', () => { firstBodyClosed = true; });
      return;
    }
    assert.equal(firstBodyClosed, true);
    response.end(JSON.stringify({ code: 200, user: { uid: 'uid', nickname: 'Alpha' } }));
  }, { BSER_API_RETRIES: 1, BSER_API_TIMEOUT_MS: 500 }, async (api) => {
    assert.equal((await api.findUserByNicknameDetailed('Alpha')).status, 'found');
    assert.equal(requests, 2);
  });
});

test('an unread 429 body preserves retry guidance without an extra request', async () => {
  let requests = 0;
  await withServer((_request, response) => {
    requests += 1;
    response.writeHead(429, { 'retry-after': '7' });
    response.flushHeaders();
  }, { BSER_API_RETRIES: 1 }, async (api) => {
    const result = await api.findUserByNicknameDetailed('Alpha');
    assert.equal(result.status, 'unavailable');
    assert.equal(result.statusCode, 429);
    assert.equal(result.retryAfter, 7);
    assert.equal(requests, 1);
  });
});

test('a timed-out body can retry once and use the next complete response', async () => {
  let requests = 0;
  await withServer((_request, response) => {
    requests += 1;
    delayedJson(response, { code: 200, user: { uid: 'uid', nickname: 'Alpha' } }, requests === 1 ? SLOW_BODY_MS : 5);
  }, { BSER_API_RETRIES: 1 }, async (api) => {
    assert.equal((await api.findUserByNicknameDetailed('Alpha')).status, 'found');
    assert.equal(requests, 2);
  });
});

test('invalid JSON is not retried as a network failure', async () => {
  let requests = 0;
  await withServer((_request, response) => {
    requests += 1;
    response.end('{invalid');
  }, { BSER_API_RETRIES: 1 }, async (api) => {
    assert.equal((await api.findUserByNicknameDetailed('Alpha')).status, 'unavailable');
    assert.equal(requests, 1);
  });
});

test('cancelling player work aborts a pending BSER body without retrying', { timeout: 3000 }, async () => {
  const headersSent = Promise.withResolvers();
  const bodyClosed = Promise.withResolvers();
  let requests = 0;
  await withServer((_request, response) => {
    requests += 1;
    response.writeHead(200, { 'content-type': 'application/json' });
    response.write('{"code":200,');
    response.once('close', bodyClosed.resolve);
    headersSent.resolve();
  }, { BSER_API_RETRIES: 1 }, async (api) => {
    const controller = new AbortController();
    const pending = playerWork.run({ signal: controller.signal, deadline: Infinity },
      () => api.fetchUserMatchesDetailed('uid'));
    const rejected = assert.rejects(pending, { status: 504 });
    await headersSent.promise;
    controller.abort();
    await rejected;
    await bodyClosed.promise;
    assert.equal(requests, 1);
  });
});

test('cancelling queued BSER work immediately frees its rate-limit slot', async () => {
  let requests = 0;
  await withServer((_request, response) => {
    requests += 1;
    response.end(JSON.stringify({ code: 200, userGames: [] }));
  }, { BSER_API_RATE_LIMIT_RPS: 1, BSER_API_RATE_LIMIT_BURST: 1 }, async (api) => {
    assert.equal((await api.fetchUserMatchesDetailed('first')).status, 'found');
    const controller = new AbortController();
    const pending = playerWork.run({ signal: controller.signal, deadline: Infinity },
      () => api.fetchUserMatchesDetailed('queued'));
    assert.equal(api.rateLimitQueue.length, 1);
    controller.abort();
    await assert.rejects(pending, { status: 504 });
    assert.equal(api.rateLimitQueue.length, 0);
    assert.equal(api.rateLimitTimer, null);
    assert.equal(requests, 1);
  });
});
