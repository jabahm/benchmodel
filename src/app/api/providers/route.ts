import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { generateId } from '@/lib/utils';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const createProviderSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['ollama', 'openai_compat']),
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
});

export async function GET() {
  const rows = await db.select().from(schema.providers).all();
  const sanitized = rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    baseUrl: r.baseUrl,
    hasApiKey: Boolean(r.apiKeyEncrypted),
    createdAt: r.createdAt,
  }));
  return NextResponse.json({ providers: sanitized });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createProviderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const id = generateId();
  await db.insert(schema.providers).values({
    id,
    name: parsed.data.name,
    type: parsed.data.type,
    baseUrl: parsed.data.baseUrl,
    apiKeyEncrypted: parsed.data.apiKey ?? null,
  });
  const created = await db
    .select()
    .from(schema.providers)
    .where(eq(schema.providers.id, id))
    .get();
  return NextResponse.json({ provider: created }, { status: 201 });
}
