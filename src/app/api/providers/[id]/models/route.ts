import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { createClient } from '@/lib/providers/registry';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const provider = await db
    .select()
    .from(schema.providers)
    .where(eq(schema.providers.id, params.id))
    .get();
  if (!provider) return NextResponse.json({ error: 'provider not found' }, { status: 404 });

  try {
    const client = createClient({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKeyEncrypted ?? undefined,
    });
    const models = await client.listModels();
    return NextResponse.json({ models });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
