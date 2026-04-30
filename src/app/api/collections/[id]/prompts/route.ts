import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { promptSchema } from '@/lib/collections/schema';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const parsed = promptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const collection = await db
    .select()
    .from(schema.collections)
    .where(eq(schema.collections.id, params.id))
    .get();
  if (!collection) {
    return NextResponse.json({ error: 'collection not found' }, { status: 404 });
  }
  const promptId = generateId();
  await db.insert(schema.prompts).values({
    id: promptId,
    collectionId: params.id,
    name: parsed.data.name,
    systemPrompt: parsed.data.system ?? null,
    userPrompt: parsed.data.user,
    variablesJson: parsed.data.variables ? JSON.stringify(parsed.data.variables) : null,
    assertionsJson: parsed.data.assertions ? JSON.stringify(parsed.data.assertions) : null,
  });
  const created = await db
    .select()
    .from(schema.prompts)
    .where(eq(schema.prompts.id, promptId))
    .get();
  return NextResponse.json({ prompt: created }, { status: 201 });
}
