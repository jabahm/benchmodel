import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '100'), 500);
  const rows = await db
    .select()
    .from(schema.runs)
    .orderBy(desc(schema.runs.createdAt))
    .limit(limit)
    .all();
  return NextResponse.json({ runs: rows });
}
