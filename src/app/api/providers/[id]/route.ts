import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await db.delete(schema.providers).where(eq(schema.providers.id, params.id));
  return NextResponse.json({ ok: true });
}
