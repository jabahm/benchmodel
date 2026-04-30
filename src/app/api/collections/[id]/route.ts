import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const collection = await db
    .select()
    .from(schema.collections)
    .where(eq(schema.collections.id, params.id))
    .get();
  if (!collection) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const prompts = await db
    .select()
    .from(schema.prompts)
    .where(eq(schema.prompts.collectionId, params.id))
    .all();
  return NextResponse.json({ collection, prompts });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await db
    .update(schema.collections)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(schema.collections.id, params.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await db.delete(schema.collections).where(eq(schema.collections.id, params.id));
  return NextResponse.json({ ok: true });
}
