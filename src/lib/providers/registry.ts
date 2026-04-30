import { OllamaClient } from './ollama';
import { OpenAICompatClient } from './openai-compat';
import type { ProviderClient, ProviderConfig } from './types';

export function createClient(config: ProviderConfig): ProviderClient {
  switch (config.type) {
    case 'ollama':
      return new OllamaClient(config);
    case 'openai_compat':
      return new OpenAICompatClient(config);
    default: {
      // exhaustive check
      const exhaustive: never = config.type;
      throw new Error(`unsupported provider type: ${String(exhaustive)}`);
    }
  }
}
