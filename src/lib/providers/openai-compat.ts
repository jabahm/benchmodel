import type {
  CompletionRequest,
  CompletionResponse,
  ProviderClient,
  ProviderConfig,
} from './types';
import { describeNetworkError, fetchWithTimeout } from './errors';

interface OpenAIModelsResponse {
  data?: Array<{ id: string }>;
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class OpenAICompatClient implements ProviderClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: ProviderConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.apiKey) headers['authorization'] = `Bearer ${this.apiKey}`;
    return headers;
  }

  async listModels(): Promise<string[]> {
    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}/models`, {
        headers: this.headers(),
        timeoutMs: 5000,
      });
    } catch (err) {
      throw new Error(describeNetworkError(err, this.baseUrl));
    }
    if (!res.ok) {
      throw new Error(
        `${this.baseUrl} responded ${res.status} ${res.statusText} when listing models.`,
      );
    }
    const data = (await res.json()) as OpenAIModelsResponse;
    return (data.data ?? []).map((m) => m.id);
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      stream: false,
    };
    if (request.params?.temperature !== undefined) body.temperature = request.params.temperature;
    if (request.params?.topP !== undefined) body.top_p = request.params.topP;
    if (request.params?.maxTokens !== undefined) body.max_tokens = request.params.maxTokens;
    if (request.params?.seed !== undefined) body.seed = request.params.seed;
    if (request.params?.stop) body.stop = request.params.stop;

    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
        timeoutMs: 120_000,
      });
    } catch (err) {
      throw new Error(describeNetworkError(err, this.baseUrl));
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${this.baseUrl} responded ${res.status}: ${text || res.statusText}`);
    }
    const data = (await res.json()) as OpenAIChatResponse;
    const output = data.choices?.[0]?.message?.content ?? '';
    return {
      output,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
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
    if (request.params?.temperature !== undefined) body.temperature = request.params.temperature;
    if (request.params?.topP !== undefined) body.top_p = request.params.topP;
    if (request.params?.maxTokens !== undefined) body.max_tokens = request.params.maxTokens;
    if (request.params?.seed !== undefined) body.seed = request.params.seed;
    if (request.params?.stop) body.stop = request.params.stop;

    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
        timeoutMs: 120_000,
      });
    } catch (err) {
      throw new Error(describeNetworkError(err, this.baseUrl));
    }
    if (!res.ok || !res.body) {
      const text = await res.text();
      throw new Error(`${this.baseUrl} responded ${res.status}: ${text || res.statusText}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const event of events) {
        for (const line of event.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // ignore malformed event
          }
        }
      }
    }
  }
}
