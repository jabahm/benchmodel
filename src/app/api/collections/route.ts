import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { generateId } from '@/lib/utils';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const createCollectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  format: z.enum(['yaml', 'json']).default('yaml'),
});

export async function GET() {
  const rows = await db.select().from(schema.collections).all();
  return NextResponse.json({ collections: rows });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const id = generateId();
  await db.insert(schema.collections).values({
    id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    format: parsed.data.format,
  });
  const created = await db
    .select()
    .from(schema.collections)
    .where(eq(schema.collections.id, id))
    .get();
  return NextResponse.json({ collection: created }, { status: 201 });
}
