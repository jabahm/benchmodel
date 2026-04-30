import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { assertionSchema } from '@/lib/collections/schema';

export const dynamic = 'force-dynamic';

const updatePromptSchema = z.object({
  name: z.string().min(1).optional(),
  systemPrompt: z.string().nullable().optional(),
  userPrompt: z.string().min(1).optional(),
  variables: z.record(z.string()).nullable().optional(),
  assertions: z.array(assertionSchema).nullable().optional(),
  defaultProviderId: z.string().nullable().optional(),
  defaultModel: z.string().nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const prompt = await db
    .select()
    .from(schema.prompts)
    .where(eq(schema.prompts.id, params.id))
    .get();
  if (!prompt) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ prompt });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const parsed = updatePromptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const update: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.systemPrompt !== undefined) update.systemPrompt = parsed.data.systemPrompt;
  if (parsed.data.userPrompt !== undefined) update.userPrompt = parsed.data.userPrompt;
  if (parsed.data.variables !== undefined) {
    update.variablesJson = parsed.data.variables ? JSON.stringify(parsed.data.variables) : null;
  }
  if (parsed.data.assertions !== undefined) {
    update.assertionsJson = parsed.data.assertions ? JSON.stringify(parsed.data.assertions) : null;
  }
  if (parsed.data.defaultProviderId !== undefined) {
    update.defaultProviderId = parsed.data.defaultProviderId;
  }
  if (parsed.data.defaultModel !== undefined) {
    update.defaultModel = parsed.data.defaultModel;
  }
  await db.update(schema.prompts).set(update).where(eq(schema.prompts.id, params.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await db.delete(schema.prompts).where(eq(schema.prompts.id, params.id));
  return NextResponse.json({ ok: true });
}
