import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { parseCollection } from '@/lib/collections/parser';
import { generateId } from '@/lib/utils';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const importSchema = z.object({
  source: z.string().min(1),
  format: z.enum(['yaml', 'json']).optional(),
  sourcePath: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  let result;
  try {
    result = parseCollection(parsed.data.source, parsed.data.format);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  const collectionId = generateId();
  const collectionInsert = db.insert(schema.collections).values({
    id: collectionId,
    name: result.data.name,
    description: result.data.description ?? null,
    format: result.format,
    sourcePath: parsed.data.sourcePath ?? null,
  });
  await collectionInsert;

  for (const p of result.data.prompts) {
    await db.insert(schema.prompts).values({
      id: generateId(),
      collectionId,
      name: p.name,
      systemPrompt: p.system ?? null,
      userPrompt: p.user,
      variablesJson: p.variables ? JSON.stringify(p.variables) : null,
      assertionsJson: p.assertions ? JSON.stringify(p.assertions) : null,
    });
  }

  const created = await db
    .select()
    .from(schema.collections)
    .where(eq(schema.collections.id, collectionId))
    .get();
  return NextResponse.json({ collection: created }, { status: 201 });
}
