import { createClient } from '../providers/registry';
import type { CompletionParams, ProviderConfig } from '../providers/types';
import { evaluateAll, type AssertionResult } from '../assertions';
import type { Assertion } from '../assertions/types';
import { estimateCost } from '../pricing/catalog';
import { elapsedMs, now } from './metrics';

export interface RunInput {
  provider: ProviderConfig;
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  variables?: Record<string, string>;
  assertions?: Assertion[];
  params?: CompletionParams;
}

export interface RunOutput {
  output: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  costEstimate: number | null;
  assertionsPassed: boolean;
  assertions: AssertionResult[];
  error?: string;
}

export function interpolate(template: string, vars?: Record<string, string>): string {
  if (!vars) return template;
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key: string) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{{${key}}}`;
  });
}

export async function executeRun(input: RunInput): Promise<RunOutput> {
  const client = createClient(input.provider);
  const userPrompt = interpolate(input.userPrompt, input.variables);
  const systemPrompt = input.systemPrompt
    ? interpolate(input.systemPrompt, input.variables)
    : undefined;

  const messages: { role: 'system' | 'user'; content: string }[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userPrompt });

  const start = now();
  try {
    const result = await client.complete({
      model: input.model,
      messages,
      params: input.params,
    });
    const latencyMs = elapsedMs(start);
    const cost = estimateCost(input.model, result.usage.promptTokens, result.usage.completionTokens);
    const evalResult = evaluateAll(result.output, input.assertions);
    return {
      output: result.output,
      latencyMs,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      costEstimate: cost,
      assertionsPassed: evalResult.passed,
      assertions: evalResult.results,
    };
  } catch (err) {
    return {
      output: '',
      latencyMs: elapsedMs(start),
      costEstimate: null,
      assertionsPassed: false,
      assertions: [],
      error: (err as Error).message,
    };
  }
}
