export type ProviderType = 'ollama' | 'openai_compat';

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionParams {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  seed?: number;
  stop?: string[];
}

export interface CompletionRequest {
  model: string;
  messages: ChatMessage[];
  params?: CompletionParams;
}

export interface CompletionUsage {
  promptTokens?: number;
  completionTokens?: number;
}

export interface CompletionResponse {
  output: string;
  usage: CompletionUsage;
  raw?: unknown;
}

export interface ProviderClient {
  listModels(): Promise<string[]>;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  streamComplete(request: CompletionRequest): AsyncIterable<string>;
}
