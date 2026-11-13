export interface LLMStreamOptions {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature: number;
  maxOutputTokens: number;
  signal?: AbortSignal;
}

export interface LLMProvider {
  stream(options: LLMStreamOptions): AsyncIterable<string>;
}
