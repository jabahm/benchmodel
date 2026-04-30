import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { executeRun } from '@/lib/runner/execute';
import { generateId, safeJsonParse } from '@/lib/utils';
import type { Assertion } from '@/lib/assertions/types';

export const dynamic = 'force-dynamic';

const invokeSchema = z.object({
  variables: z.record(z.string()).optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const raw = await request.json().catch(() => ({}));
  const parsed = invokeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const prompt = await db
    .select()
    .from(schema.prompts)
    .where(eq(schema.prompts.id, params.id))
    .get();
  if (!prompt) return NextResponse.json({ error: 'prompt not found' }, { status: 404 });

  if (!prompt.defaultProviderId || !prompt.defaultModel) {
    return NextResponse.json(
      {
        error:
          'prompt has no default provider or model. Set them in the prompt editor before calling the invoke endpoint.',
      },
      { status: 400 },
    );
  }

  const provider = await db
    .select()
    .from(schema.providers)
    .where(eq(schema.providers.id, prompt.defaultProviderId))
    .get();
  if (!provider) {
    return NextResponse.json(
      { error: 'configured provider no longer exists' },
      { status: 400 },
    );
  }

  const storedVars = safeJsonParse<Record<string, string>>(prompt.variablesJson, {});
  const variables = { ...storedVars, ...(parsed.data.variables ?? {}) };
  const assertions = safeJsonParse<Assertion[] | undefined>(prompt.assertionsJson, undefined);

  const result = await executeRun({
    provider: {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKeyEncrypted ?? undefined,
    },
    model: prompt.defaultModel,
    systemPrompt: prompt.systemPrompt ?? undefined,
    userPrompt: prompt.userPrompt,
    variables,
    assertions,
  });

  await db.insert(schema.runs).values({
    id: generateId(),
    promptId: prompt.id,
    providerId: provider.id,
    modelName: prompt.defaultModel,
    paramsJson: null,
    output: result.output,
    latencyMs: result.latencyMs,
    promptTokens: result.promptTokens ?? null,
    completionTokens: result.completionTokens ?? null,
    costEstimate: result.costEstimate,
    assertionsPassed: result.assertionsPassed,
    assertionsResultJson: JSON.stringify(result.assertions),
    seed: null,
    errorMessage: result.error ?? null,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ output: result.output });
}
