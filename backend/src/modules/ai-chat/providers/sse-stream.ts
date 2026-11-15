import { BadGatewayException } from '@nestjs/common';

// A network chunk can split an SSE line, CRLF, JSON, or a UTF-8 character.
export async function* readSseData(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let buffer = '';
  let lines: string[] = [];
  let eventSize = 0;
  const maxEventSize = 64 * 1024;

  function consumeLine(line: string): string | undefined {
    if (line === '') {
      const data = lines.length ? lines.join('\n') : undefined;
      lines = [];
      eventSize = 0;
      return data;
    }
    eventSize += line.length;
    if (eventSize > maxEventSize) {
      throw new BadGatewayException('LLM 스트림 이벤트가 너무 큽니다.');
    }
    if (line === 'data' || line.startsWith('data:')) {
      lines.push(line.slice(5).replace(/^ /, ''));
    }
    return undefined;
  }

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.search(/[\r\n]/)) !== -1) {
        if (!done && buffer[newline] === '\r' && newline === buffer.length - 1) break;
        const line = buffer.slice(0, newline);
        const separatorLength = buffer.slice(newline, newline + 2) === '\r\n' ? 2 : 1;
        buffer = buffer.slice(newline + separatorLength);
        const data = consumeLine(line);
        if (data !== undefined) yield data;
      }
      if (buffer.length + eventSize > maxEventSize) {
        throw new BadGatewayException('LLM 스트림 이벤트가 너무 큽니다.');
      }
      if (done) {
        // SSE dispatch requires a blank line; an unfinished event is a failure.
        if (buffer.length || lines.length) {
          throw new BadGatewayException('LLM 스트림이 불완전하게 종료되었습니다.');
        }
        return;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
