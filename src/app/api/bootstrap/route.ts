import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db/client';
import { generateId } from '@/lib/utils';
import { eq } from 'drizzle-orm';
import { parseCollection } from '@/lib/collections/parser';
import { EXAMPLE_COLLECTION_YAML } from '@/lib/seed/example';

export const dynamic = 'force-dynamic';

const OLLAMA_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

async function probeOllama(baseUrl: string, timeoutMs = 1500): Promise<string[] | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`, { signal: ctrl.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    return (data.models ?? []).map((m) => m.name);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function seedExampleCollection(): Promise<boolean> {
  const existing = await db.select().from(schema.collections).all();
  if (existing.length > 0) return false;
  let parsed;
  try {
    parsed = parseCollection(EXAMPLE_COLLECTION_YAML);
  } catch {
    return false;
  }
  const collectionId = generateId();
  await db.insert(schema.collections).values({
    id: collectionId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    format: parsed.format,
    sourcePath: 'examples/collection.example.yaml',
  });
  for (const p of parsed.data.prompts) {
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
  return true;
}

export async function POST() {
  let seededProvider = false;
  let models: string[] | null = null;
  let providerReason: string | null = null;
  let createdProviderId: string | null = null;

  const existingProviders = await db.select().from(schema.providers).all();
  if (existingProviders.length === 0) {
    models = await probeOllama(OLLAMA_URL);
    if (models) {
      createdProviderId = generateId();
      await db.insert(schema.providers).values({
        id: createdProviderId,
        name: 'Local Ollama',
        type: 'ollama',
        baseUrl: OLLAMA_URL,
        apiKeyEncrypted: null,
      });
      seededProvider = true;
    } else {
      providerReason = 'ollama_unreachable';
    }
  }

  const seededCollection = await seedExampleCollection();

  const provider = createdProviderId
    ? await db
        .select()
        .from(schema.providers)
        .where(eq(schema.providers.id, createdProviderId))
        .get()
    : null;

  return NextResponse.json({
    seededProvider,
    seededCollection,
    providerReason,
    attemptedUrl: OLLAMA_URL,
    provider,
    models,
  });
}
