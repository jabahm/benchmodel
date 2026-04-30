import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { executeRun } from '@/lib/runner/execute';
import { generateId, safeJsonParse } from '@/lib/utils';
import type { Assertion } from '@/lib/assertions/types';

export const dynamic = 'force-dynamic';

const runSchema = z.object({
  promptId: z.string(),
  providerId: z.string(),
  model: z.string(),
  variables: z.record(z.string()).optional(),
  params: z
    .object({
      temperature: z.number().optional(),
      topP: z.number().optional(),
      maxTokens: z.number().optional(),
      seed: z.number().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = runSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const prompt = await db
    .select()
    .from(schema.prompts)
    .where(eq(schema.prompts.id, parsed.data.promptId))
    .get();
  if (!prompt) return NextResponse.json({ error: 'prompt not found' }, { status: 404 });
  const provider = await db
    .select()
    .from(schema.providers)
    .where(eq(schema.providers.id, parsed.data.providerId))
    .get();
  if (!provider) return NextResponse.json({ error: 'provider not found' }, { status: 404 });

  const assertions = safeJsonParse<Assertion[] | undefined>(prompt.assertionsJson, undefined);
  const storedVars = safeJsonParse<Record<string, string> | undefined>(
    prompt.variablesJson,
    undefined,
  );
  const variables = { ...(storedVars ?? {}), ...(parsed.data.variables ?? {}) };

  const result = await executeRun({
    provider: {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKeyEncrypted ?? undefined,
    },
    model: parsed.data.model,
    systemPrompt: prompt.systemPrompt ?? undefined,
    userPrompt: prompt.userPrompt,
    variables,
    assertions,
    params: parsed.data.params,
  });

  const runId = generateId();
  await db.insert(schema.runs).values({
    id: runId,
    promptId: prompt.id,
    providerId: provider.id,
    modelName: parsed.data.model,
    paramsJson: parsed.data.params ? JSON.stringify(parsed.data.params) : null,
    output: result.output,
    latencyMs: result.latencyMs,
    promptTokens: result.promptTokens ?? null,
    completionTokens: result.completionTokens ?? null,
    costEstimate: result.costEstimate,
    assertionsPassed: result.assertionsPassed,
    assertionsResultJson: JSON.stringify(result.assertions),
    seed: parsed.data.params?.seed ?? null,
    errorMessage: result.error ?? null,
  });

  return NextResponse.json({ runId, ...result });
}
