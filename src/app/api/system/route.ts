import { NextResponse } from 'next/server';
import os from 'node:os';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  return NextResponse.json({
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    hostname: os.hostname(),
    cpuModel: cpus[0]?.model?.trim() ?? 'unknown',
    cpuCount: cpus.length,
    cpuSpeedMhz: cpus[0]?.speed ?? 0,
    totalMemBytes: totalMem,
    freeMemBytes: freeMem,
    nodeVersion: process.version,
  });
}
