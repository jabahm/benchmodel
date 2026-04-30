import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const run = await db.select().from(schema.runs).where(eq(schema.runs.id, params.id)).get();
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const prompt = await db
    .select()
    .from(schema.prompts)
    .where(eq(schema.prompts.id, run.promptId))
    .get();
  const provider = await db
    .select()
    .from(schema.providers)
    .where(eq(schema.providers.id, run.providerId))
    .get();
  return NextResponse.json({ run, prompt: prompt ?? null, provider: provider ?? null });
}
