import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { executeRun, interpolate } from '@/lib/runner/execute';
import { createClient } from '@/lib/providers/registry';

export const dynamic = 'force-dynamic';

const runSchema = z.object({
  providerId: z.string().min(1),
  model: z.string().min(1),
  systemPrompt: z.string().optional(),
  userPrompt: z.string().min(1),
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
  const url = new URL(request.url);
  const stream = url.searchParams.get('stream') === 'true';

  const body = await request.json();
  const parsed = runSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const provider = await db
    .select()
    .from(schema.providers)
    .where(eq(schema.providers.id, parsed.data.providerId))
    .get();
  if (!provider) {
    return NextResponse.json({ error: 'Provider not found.' }, { status: 404 });
  }

  if (!stream) {
    const result = await executeRun({
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKeyEncrypted ?? undefined,
      },
      model: parsed.data.model,
      systemPrompt: parsed.data.systemPrompt,
      userPrompt: parsed.data.userPrompt,
      variables: parsed.data.variables,
      params: parsed.data.params,
    });
    return NextResponse.json(result);
  }

  // Streaming path: SSE-like deltas, ending with a single done event.
  const client = createClient({
    id: provider.id,
    name: provider.name,
    type: provider.type,
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKeyEncrypted ?? undefined,
  });

  const userPrompt = interpolate(parsed.data.userPrompt, parsed.data.variables);
  const systemPrompt = parsed.data.systemPrompt
    ? interpolate(parsed.data.systemPrompt, parsed.data.variables)
    : undefined;
  const messages: { role: 'system' | 'user'; content: string }[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userPrompt });

  const encoder = new TextEncoder();
  const start = Date.now();

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const delta of client.streamComplete({
          model: parsed.data.model,
          messages,
          params: parsed.data.params,
        })) {
          send({ type: 'delta', value: delta });
        }
        send({ type: 'done', latencyMs: Date.now() - start });
      } catch (err) {
        send({ type: 'error', message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
