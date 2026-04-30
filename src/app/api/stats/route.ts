import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const runs = await db.select().from(schema.runs).all();

  const totalRuns = runs.length;
  const totalTokens = runs.reduce(
    (acc, r) => acc + (r.promptTokens ?? 0) + (r.completionTokens ?? 0),
    0,
  );

  const withLatency = runs.filter((r) => (r.latencyMs ?? 0) > 0);
  const avgLatencyMs =
    withLatency.length > 0
      ? Math.round(
          withLatency.reduce((acc, r) => acc + (r.latencyMs ?? 0), 0) / withLatency.length,
        )
      : 0;

  const tokenRateRuns = runs.filter(
    (r) => (r.latencyMs ?? 0) > 0 && (r.completionTokens ?? 0) > 0,
  );
  const tokensPerSec =
    tokenRateRuns.length > 0
      ? tokenRateRuns.reduce(
          (acc, r) => acc + ((r.completionTokens ?? 0) / ((r.latencyMs ?? 1) / 1000)),
          0,
        ) / tokenRateRuns.length
      : 0;

  const withAssertions = runs.filter((r) => r.assertionsPassed !== null);
  const passRate =
    withAssertions.length > 0
      ? withAssertions.filter((r) => r.assertionsPassed).length / withAssertions.length
      : 0;

  const sparklineRows = await db
    .select({ latencyMs: schema.runs.latencyMs })
    .from(schema.runs)
    .orderBy(desc(schema.runs.createdAt))
    .limit(30);
  const latencySparkline = sparklineRows
    .reverse()
    .map((r) => r.latencyMs ?? 0)
    .filter((n) => n > 0);

  return NextResponse.json({
    totalRuns,
    totalTokens,
    avgLatencyMs,
    tokensPerSec,
    passRate,
    latencySparkline,
  });
}
