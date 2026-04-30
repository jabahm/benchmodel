import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function POST() {
  await db.delete(schema.runs);
  return NextResponse.json({ ok: true });
}
