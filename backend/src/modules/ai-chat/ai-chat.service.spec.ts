import 'reflect-metadata';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { once } from 'node:events';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AddressInfo } from 'node:net';
import { AIChatService } from './ai-chat.service';
import { AIChatModule } from './ai-chat.module';
import { ORIGINAL_PERSONA_ERI } from './persona.config';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { LLMStreamOptions } from './providers/llm-provider.interface';
import { readSseData } from './providers/sse-stream';

const nativeFetch = globalThis.fetch.bind(globalThis);
const envNames = ['LLM_PROVIDER', 'GEMINI_API_KEY', 'OPENAI_API_KEY'] as const;
let previousEnv: Array<string | undefined>;

beforeEach(() => {
  previousEnv = envNames.map((name) => process.env[name]);
  delete process.env.LLM_PROVIDER;
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.OPENAI_API_KEY = 'test-openai-key';
});

afterEach(() => {
  mock.restoreAll();
  for (const [index, name] of envNames.entries()) {
    if (previousEnv[index] === undefined) delete process.env[name];
    else process.env[name] = previousEnv[index];
  }
});

const options: LLMStreamOptions = {
  systemPrompt: ORIGINAL_PERSONA_ERI.systemPrompt,
  messages: [{ role: 'user', content: '전술 알려줘' }, { role: 'assistant', content: '데이터부터 보자.' }],
  temperature: 0.7,
  maxOutputTokens: 600,
};

async function collect(stream: AsyncIterable<string>): Promise<string[]> {
  const values: string[] = [];
  for await (const value of stream) values.push(value);
  return values;
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function sseResponse(text: string, chunkSize = 7): Response {
  const bytes = new TextEncoder().encode(text);
  let offset = 0;
  return new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) return controller.close();
      controller.enqueue(bytes.slice(offset, offset + chunkSize));
      offset += chunkSize;
    },
  }), { headers: { 'Content-Type': 'text/event-stream' } });
}

const openAIToken = (text: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
const geminiToken = (text: string, finishReason?: string) =>
  `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason }] })}\n\n`;
const service = () => new AIChatService(new GeminiProvider(), new OpenAIProvider());

async function withApp(run: (url: string, app: INestApplication) => Promise<void>) {
  const app = await NestFactory.create(AIChatModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true },
  }));
  try {
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as AddressInfo;
    await run(`http://127.0.0.1:${port}/api/ai-chat/stream`, app);
  } finally {
    await app.close();
  }
}

function post(url: string, body: unknown, signal?: AbortSignal) {
  return nativeFetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
  });
}

test('defaults to Gemini and forwards persona settings independently from the engine', async () => {
  const calls: LLMStreamOptions[] = [];
  const gemini: GeminiProvider = { async *stream(request) { calls.push(request); yield '안녕'; yield '!'; } };
  const openai: OpenAIProvider = { async *stream() { throw new Error('unexpected provider'); } };
  const chat = new AIChatService(gemini, openai);
  assert.deepEqual(await collect(chat.stream('질문')), ['안녕', '!']);
  assert.equal(calls[0].systemPrompt, ORIGINAL_PERSONA_ERI.systemPrompt);
  assert.equal(calls[0].maxOutputTokens, 600);
  assert.equal(calls[0].temperature, 0.7);
  assert.deepEqual(calls[0].messages, [{ role: 'user', content: '질문' }]);
  assert.equal(calls[0].signal?.aborted, true, 'finished requests release upstream resources');
  await collect(chat.stream('다른 질문', undefined, { ...ORIGINAL_PERSONA_ERI, systemPrompt: '다른 분석관' }));
  assert.equal(calls[1].systemPrompt, '다른 분석관');
});

test('selects the provider per request and rejects unknown providers without a fallback', async () => {
  const chat = new AIChatService(
    { async *stream() { yield 'gemini'; } },
    { async *stream() { yield 'openai'; } },
  );
  process.env.LLM_PROVIDER = 'openai';
  assert.deepEqual(await collect(chat.stream('질문')), ['openai']);
  process.env.LLM_PROVIDER = 'gemini';
  assert.deepEqual(await collect(chat.stream('질문')), ['gemini']);
  process.env.LLM_PROVIDER = 'invalid';
  await assert.rejects(collect(chat.stream('질문')), (error: { getStatus(): number }) => error.getStatus() === 503);
});

test('SSE parser preserves split UTF-8, CRLF, multiline data and ignores metadata/comments', async () => {
  const response = sseResponse(': ping\r\nevent: message\r\ndata: {"text":\r\ndata: "한글😀"}\r\n\r\n', 1);
  assert.deepEqual(await collect(readSseData(response.body!)), ['{"text":\n"한글😀"}']);
});

test('SSE parser rejects oversized events and truncated frames', async () => {
  for (const text of ['data: ' + 'x'.repeat(64 * 1024), 'data: {"text":"끊김"}\n']) {
    await assert.rejects(collect(readSseData(sseResponse(text, 4096).body!)));
  }
});

test('Gemini maps assistant roles and sends system instruction, budget and safety settings', async () => {
  const abort = new AbortController();
  mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse');
    assert.equal(init.method, 'POST');
    assert.equal(new Headers(init.headers).get('x-goog-api-key'), 'test-gemini-key');
    assert.equal(init.signal, abort.signal);
    const body = JSON.parse(init.body as string);
    assert.deepEqual(body.systemInstruction.parts, [{ text: options.systemPrompt }]);
    assert.equal(body.contents[1].role, 'model');
    assert.equal(body.generationConfig.maxOutputTokens, 600);
    assert.equal(body.generationConfig.temperature, 0.7);
    assert.equal(body.safetySettings.length, 4);
    return sseResponse(geminiToken('한글') + geminiToken(' 응답', 'STOP'), 1);
  });
  assert.deepEqual(await collect(new GeminiProvider().stream({ ...options, signal: abort.signal })), ['한글', ' 응답']);
});

test('OpenAI sends GPT-4o-mini chat completions and skips role/usage chunks', async () => {
  mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer test-openai-key');
    const body = JSON.parse(init.body as string);
    assert.equal(body.model, 'gpt-4o-mini');
    assert.equal(body.stream, true);
    assert.equal(body.max_tokens, 600);
    assert.equal(body.temperature, 0.7);
    assert.deepEqual(body.messages, [{ role: 'system', content: options.systemPrompt }, ...options.messages]);
    return sseResponse('data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n' +
      openAIToken('분석😀') + 'data: {"choices":[],"usage":{"completion_tokens":2}}\n\n' +
      'data: [DONE]\n\n', 1);
  });
  assert.deepEqual(await collect(new OpenAIProvider().stream(options)), ['분석😀']);
});

test('only the selected provider requires an API key, and missing keys never call fetch', async () => {
  delete process.env.OPENAI_API_KEY;
  const fetchMock = mock.method(globalThis, 'fetch', async () => sseResponse(geminiToken('정상', 'STOP')));
  assert.deepEqual(await collect(service().stream('질문')), ['정상']);
  process.env.LLM_PROVIDER = 'openai';
  await assert.rejects(collect(service().stream('질문')), (error: { getStatus(): number }) => error.getStatus() === 503);
  delete process.env.GEMINI_API_KEY;
  process.env.LLM_PROVIDER = 'gemini';
  await assert.rejects(collect(service().stream('질문')), (error: { getStatus(): number }) => error.getStatus() === 503);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('upstream HTTP, network, malformed JSON and in-band errors are sanitized without retries', async () => {
  for (const provider of ['gemini', 'openai']) {
    process.env.LLM_PROVIDER = provider;
    for (const failure of ['http', 'network', 'json', 'error', 'empty']) {
      const fetchMock = mock.method(globalThis, 'fetch', async () => {
        if (failure === 'network') throw new Error('secret-key');
        if (failure === 'http') return new Response('secret-key', { status: 429 });
        if (failure === 'empty') return new Response(null);
        return sseResponse(failure === 'json' ? 'data: invalid-json\n\n' : 'data: {"error":"secret-key"}\n\n');
      });
      await assert.rejects(collect(service().stream('질문')), (error: Error & { getStatus(): number }) => {
        assert.equal(error.getStatus(), 502);
        assert.ok(!error.message.includes('secret-key'));
        return true;
      });
      assert.equal(fetchMock.mock.callCount(), 1);
      fetchMock.mock.restore();
    }
  }
});

test('provider safety blocks and missing completion markers fail instead of reporting success', async () => {
  const cases = [
    ['gemini', 'data: {"promptFeedback":{"blockReason":"SAFETY"}}\n\n'],
    ['gemini', geminiToken('', 'SAFETY')],
    ['gemini', geminiToken('불완전')],
    ['openai', 'data: {"choices":[{"finish_reason":"content_filter"}]}\n\n'],
    ['openai', openAIToken('불완전')],
  ];
  for (const [provider, data] of cases) {
    process.env.LLM_PROVIDER = provider;
    const fetchMock = mock.method(globalThis, 'fetch', async () => sseResponse(data));
    await assert.rejects(collect(service().stream('질문')));
    fetchMock.mock.restore();
  }
});

test('cancelled requests abort upstream fetch and already-cancelled requests do not call providers', async () => {
  const abort = new AbortController();
  let upstreamSignal: AbortSignal | undefined;
  const started = deferred();
  const provider: GeminiProvider = {
    async *stream(request) {
      upstreamSignal = request.signal;
      started.resolve();
      await once(request.signal!, 'abort');
      request.signal!.throwIfAborted();
      yield 'unreachable';
    },
  };
  const chat = new AIChatService(provider, new OpenAIProvider());
  const pending = collect(chat.stream('질문', abort.signal));
  await started.promise;
  abort.abort();
  await assert.rejects(pending);
  assert.equal(upstreamSignal?.aborted, true);
  const fetchMock = mock.method(globalThis, 'fetch');
  await assert.rejects(collect(service().stream('질문', abort.signal)));
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('upstream timeout aborts generation and becomes HTTP 504', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const started = deferred();
  const chat = new AIChatService({
    async *stream(request) {
      started.resolve();
      await once(request.signal!, 'abort');
      request.signal!.throwIfAborted();
      yield 'unreachable';
    },
  }, new OpenAIProvider());
  const pending = collect(chat.stream('질문'));
  await started.promise;
  context.mock.timers.tick(30_000);
  await assert.rejects(pending, (error: { getStatus(): number }) => error.getStatus() === 504);
});

test('POST validates strict string input and the 500-character limit before calling providers', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => sseResponse(geminiToken('정상', 'STOP')));
  await withApp(async (url) => {
    for (const body of [{}, { message: '' }, { message: '   ' }, { message: 123 },
      { message: true }, { message: null }, { message: {} }, { message: [] }, { message: '가'.repeat(501) }]) {
      const response = await post(url, body);
      assert.equal(response.status, 400, JSON.stringify(body));
      assert.match(response.headers.get('content-type')!, /application\/json/);
      await response.text();
    }
    assert.equal(fetchMock.mock.callCount(), 0);
    const valid = await post(url, { message: '가'.repeat(500) });
    assert.equal(valid.status, 200);
    await valid.text();
    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal((await nativeFetch(url)).status, 404);
  });
});

test('POST streams tokens before completion with SSE headers and a single done event', async () => {
  process.env.LLM_PROVIDER = 'openai';
  const finish = deferred();
  mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    assert.equal(body.messages[0].content, ORIGINAL_PERSONA_ERI.systemPrompt);
    assert.equal(body.messages[1].content, '전술');
    let first = true;
    return new Response(new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (first) {
          first = false;
          controller.enqueue(new TextEncoder().encode(openAIToken('첫 토큰\n😀')));
        } else {
          await finish.promise;
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    }));
  });
  try {
    await withApp(async (url) => {
      const response = await post(url, { message: ' 전술 ', systemPrompt: 'untrusted override' });
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type')!, /text\/event-stream/);
      assert.equal(response.headers.get('cache-control'), 'no-cache, no-transform');
      assert.equal(response.headers.get('x-accel-buffering'), 'no');
      const reader = response.body!.getReader();
      const first = new TextDecoder().decode((await reader.read()).value);
      assert.match(first, /event: token/);
      assert.ok(!first.includes('event: done'));
      assert.match(first, /data: \{"text":"첫 토큰\\n😀"\}/);
      finish.resolve();
      let remaining = '';
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        remaining += new TextDecoder().decode(chunk.value);
      }
      assert.equal(remaining, 'event: done\ndata: {}\n\n');
    });
  } finally {
    finish.resolve();
  }
});

test('initial upstream/configuration errors remain HTTP errors and midstream errors use SSE', async () => {
  await withApp(async (url) => {
    delete process.env.GEMINI_API_KEY;
    const unavailable = await post(url, { message: '질문' });
    assert.equal(unavailable.status, 503);
    assert.match(unavailable.headers.get('content-type')!, /application\/json/);
    await unavailable.text();

    process.env.GEMINI_API_KEY = 'test-key';
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response('secret-key', { status: 500 }));
    const upstreamFailure = await post(url, { message: '질문' });
    assert.equal(upstreamFailure.status, 502);
    assert.ok(!(await upstreamFailure.text()).includes('secret-key'));
    fetchMock.mock.restore();

    mock.method(globalThis, 'fetch', async () => sseResponse(geminiToken('부분 응답') + 'data: invalid-json\n\n'));
    const response = await post(url, { message: '질문' });
    const text = await response.text();
    assert.equal(response.status, 200);
    assert.match(text, /event: token/);
    assert.match(text, /event: error/);
    assert.ok(!text.includes('event: done'));
    assert.ok(!text.includes('invalid-json'));
  });
});

test('disconnecting the HTTP client cancels the upstream stream', { timeout: 5000 }, async () => {
  let upstreamSignal: AbortSignal | undefined;
  mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    upstreamSignal = init.signal!;
    return new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(geminiToken('첫 토큰')));
        init.signal!.addEventListener('abort', () => controller.error(new Error('aborted')), { once: true });
      },
    }));
  });
  await withApp(async (url) => {
    const abort = new AbortController();
    const response = await post(url, { message: '질문' }, abort.signal);
    const reader = response.body!.getReader();
    assert.ok((await reader.read()).value?.length);
    const cancelled = once(upstreamSignal!, 'abort');
    abort.abort();
    await cancelled;
    assert.equal(upstreamSignal?.aborted, true);
    await reader.cancel().catch(() => undefined);
  });
});
