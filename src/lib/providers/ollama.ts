import type {
  ChatMessage,
  CompletionRequest,
  CompletionResponse,
  ProviderClient,
  ProviderConfig,
} from './types';
import { describeNetworkError, fetchWithTimeout } from './errors';

interface OllamaTagsResponse {
  models?: Array<{ name: string }>;
}

interface OllamaChatResponse {
  message?: { role: string; content: string };
  prompt_eval_count?: number;
  eval_count?: number;
  done?: boolean;
}

async function readOllamaError(res: Response): Promise<string> {
  const text = await res.text();
  let message = text || res.statusText;
  try {
    const parsed = JSON.parse(text) as { error?: string };
    if (parsed.error) message = parsed.error;
  } catch {
    // not JSON, keep the raw text
  }
  if (res.status === 400 && /does not support chat/i.test(message)) {
    return `${message}. Pick a chat model instead of an embedding model.`;
  }
  if (res.status === 500 && /more system memory/i.test(message)) {
    return `${message}. Try a smaller model or free up RAM.`;
  }
  return `Ollama (${res.status}): ${message}`;
}

export class OllamaClient implements ProviderClient {
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  async listModels(): Promise<string[]> {
    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}/api/tags`, { timeoutMs: 4000 });
    } catch (err) {
      throw new Error(describeNetworkError(err, this.baseUrl));
    }
    if (!res.ok) {
      throw new Error(`Ollama responded ${res.status} ${res.statusText} from ${this.baseUrl}`);
    }
    const data = (await res.json()) as OllamaTagsResponse;
    return (data.models ?? []).map((m) => m.name);
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const messages: ChatMessage[] = request.messages;
    const body: Record<string, unknown> = {
      model: request.model,
      messages,
      stream: false,
    };
    const options: Record<string, unknown> = {};
    if (request.params?.temperature !== undefined) options.temperature = request.params.temperature;
    if (request.params?.topP !== undefined) options.top_p = request.params.topP;
    if (request.params?.maxTokens !== undefined) options.num_predict = request.params.maxTokens;
    if (request.params?.seed !== undefined) options.seed = request.params.seed;
    if (request.params?.stop) options.stop = request.params.stop;
    if (Object.keys(options).length > 0) body.options = options;

    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        timeoutMs: 120_000,
      });
    } catch (err) {
      throw new Error(describeNetworkError(err, this.baseUrl));
    }
    if (!res.ok) {
      throw new Error(await readOllamaError(res));
    }
    const data = (await res.json()) as OllamaChatResponse;
    return {
      output: data.message?.content ?? '',
      usage: {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
      },
      raw: data,
    };
  }

  async *streamComplete(request: CompletionRequest): AsyncIterable<string> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      stream: true,
    };
    const options: Record<string, unknown> = {};
    if (request.params?.temperature !== undefined) options.temperature = request.params.temperature;
    if (request.params?.topP !== undefined) options.top_p = request.params.topP;
    if (request.params?.maxTokens !== undefined) options.num_predict = request.params.maxTokens;
    if (request.params?.seed !== undefined) options.seed = request.params.seed;
    if (request.params?.stop) options.stop = request.params.stop;
    if (Object.keys(options).length > 0) body.options = options;

    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        timeoutMs: 120_000,
      });
    } catch (err) {
      throw new Error(describeNetworkError(err, this.baseUrl));
    }
    if (!res.ok || !res.body) {
      throw new Error(await readOllamaError(res));
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed) as OllamaChatResponse;
          const delta = parsed.message?.content;
          if (delta) yield delta;
          if (parsed.done) return;
        } catch {
          // ignore malformed line
        }
      }
    }
  }
}
