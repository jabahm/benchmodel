import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { serializeCollection } from '@/lib/collections/serializer';
import type { CollectionInput, AssertionInput } from '@/lib/collections/schema';
import { safeJsonParse } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const url = new URL(request.url);
  const formatParam = url.searchParams.get('format');
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

  const data: CollectionInput = {
    name: collection.name,
    description: collection.description ?? undefined,
    prompts: prompts.map((p) => ({
      name: p.name,
      system: p.systemPrompt ?? undefined,
      user: p.userPrompt,
      variables: safeJsonParse<Record<string, string> | undefined>(p.variablesJson, undefined),
      assertions: safeJsonParse<AssertionInput[] | undefined>(p.assertionsJson, undefined),
    })),
  };

  const format = (formatParam === 'json' || formatParam === 'yaml')
    ? formatParam
    : collection.format;
  const body = serializeCollection(data, format);
  const contentType = format === 'json' ? 'application/json' : 'application/x-yaml';
  return new NextResponse(body, {
    headers: {
      'content-type': contentType,
      'content-disposition': `attachment; filename="${collection.name}.${format === 'json' ? 'json' : 'yaml'}"`,
    },
  });
}
