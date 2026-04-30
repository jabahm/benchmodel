import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/providers/registry';

export const dynamic = 'force-dynamic';

const testSchema = z.object({
  type: z.enum(['ollama', 'openai_compat']),
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid input' }, { status: 400 });
  }
  try {
    const client = createClient({
      id: 'test',
      name: 'test',
      type: parsed.data.type,
      baseUrl: parsed.data.baseUrl,
      apiKey: parsed.data.apiKey,
    });
    const models = await client.listModels();
    return NextResponse.json({ ok: true, models });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 200 });
  }
}
