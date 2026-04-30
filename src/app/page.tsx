'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useCollections } from '@/hooks/use-collections';
import { useProviders, useProviderModels } from '@/hooks/use-providers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  ChevronRight,
  Zap,
  Cpu,
  HardDrive,
  FolderOpen,
  Server,
  Layers,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewCollectionDialog } from '@/components/collections/new-collection-dialog';

interface RunRow {
  id: string;
  modelName: string;
  latencyMs: number | null;
  assertionsPassed: boolean | null;
  errorMessage: string | null;
  createdAt: string | number;
  output: string | null;
}

interface Stats {
  totalRuns: number;
  totalTokens: number;
  avgLatencyMs: number;
  tokensPerSec: number;
  passRate: number;
  latencySparkline: number[];
}

interface SystemInfo {
  platform: string;
  arch: string;
  release: string;
  hostname: string;
  cpuModel: string;
  cpuCount: number;
  cpuSpeedMhz: number;
  totalMemBytes: number;
  freeMemBytes: number;
  nodeVersion: string;
}

export default function DashboardPage() {
  const collections = useCollections();
  const providers = useProviders();
  const firstProvider = providers.data?.[0] ?? null;
  const models = useProviderModels(firstProvider?.id ?? null);

  const history = useQuery({
    queryKey: ['history-recent'],
    queryFn: async (): Promise<{ runs: RunRow[] }> => {
      const res = await fetch('/api/history?limit=5');
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
  });

  const stats = useQuery({
    queryKey: ['stats'],
    queryFn: async (): Promise<Stats> => {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
  });

  const system = useQuery({
    queryKey: ['system'],
    queryFn: async (): Promise<SystemInfo> => {
      const res = await fetch('/api/system');
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
  });

  const [createOpen, setCreateOpen] = useState(false);

  const runs = history.data?.runs ?? [];
  const recentCollections = (collections.data ?? [])
    .slice()
    .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
    .slice(0, 5);

  const s = stats.data;
  const sys = system.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-[#FCFD81] text-[#0F1007] hover:bg-[#FCFD81]/90"
        >
          <Plus className="mr-2 h-4 w-4" /> New collection
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ComputeCard system={sys} />
        <ThroughputCard stats={s} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CountTile
          icon={<FolderOpen className="h-4 w-4" />}
          label="Collections"
          value={collections.data?.length ?? 0}
          href="/collections"
        />
        <CountTile
          icon={<Server className="h-4 w-4" />}
          label="Providers"
          value={providers.data?.length ?? 0}
          href="/providers"
        />
        <CountTile
          icon={<Layers className="h-4 w-4" />}
          label="Models"
          value={models.data?.length ?? 0}
          href="/providers"
        />
        <CountTile
          icon={<History className="h-4 w-4" />}
          label="Total runs"
          value={s?.totalRuns ?? 0}
          href="/history"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent runs</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/history">View all</Link>
            </Button>
          </div>
          {runs.length === 0 ? (
            <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              No runs yet. Open a collection and try a prompt to see results here.
            </div>
          ) : (
            <ul className="divide-y">
              {runs.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">
                      {formatDate(r.createdAt)}
                    </div>
                    <div className="truncate font-mono text-sm">{r.modelName}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{formatLatency(r.latencyMs ?? 0)}</Badge>
                    {r.assertionsPassed === null ? null : (
                      <Badge variant={r.assertionsPassed ? 'success' : 'destructive'}>
                        {r.assertionsPassed ? 'pass' : 'fail'}
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Latest collections</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/collections">View all</Link>
            </Button>
          </div>
          {recentCollections.length === 0 ? (
            <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              No collections yet.
            </div>
          ) : (
            <ul className="divide-y">
              {recentCollections.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/collections/${c.id}`}
                    className="group flex items-center justify-between gap-2 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </div>
                      <div className="truncate text-sm font-medium">{c.name}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <NewCollectionDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function ComputeCard({ system, className }: { system: SystemInfo | undefined; className?: string }) {
  const memUsed = system ? system.totalMemBytes - system.freeMemBytes : 0;
  const memPct = system && system.totalMemBytes > 0 ? memUsed / system.totalMemBytes : 0;
  return (
    <Card className={cn('flex flex-col gap-4 p-6', className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Cpu className="h-4 w-4" />
        <span>Compute</span>
      </div>
      {!system ? (
        <div className="text-sm text-muted-foreground">Loading machine info.</div>
      ) : (
        <>
          <div>
            <div className="line-clamp-2 text-base font-semibold">{system.cpuModel}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {system.cpuCount} core{system.cpuCount === 1 ? '' : 's'}
              {system.cpuSpeedMhz > 0 ? ` · ${(system.cpuSpeedMhz / 1000).toFixed(2)} GHz` : ''} ·{' '}
              {prettyPlatform(system.platform)} {system.arch}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-muted-foreground">
                <HardDrive className="h-3 w-3" />
                Memory
              </span>
              <span className="font-mono">
                {formatBytes(memUsed)} / {formatBytes(system.totalMemBytes)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground/60"
                style={{ width: `${Math.round(memPct * 100)}%` }}
              />
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function ThroughputCard({ stats, className }: { stats: Stats | undefined; className?: string }) {
  return (
    <Card className={cn('flex flex-col gap-3 p-6', className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Zap className="h-4 w-4" />
        <span>Throughput</span>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-3xl font-semibold tabular-nums">
          {stats ? formatNumber(stats.tokensPerSec, 1) : '-'}
        </div>
        <div className="text-sm text-muted-foreground">tok/s</div>
      </div>
      <Sparkline values={stats?.latencySparkline ?? []} />
      <p className="text-xs text-muted-foreground">
        Average completion tokens per second across recent runs. The chart shows latency over the
        last 30 runs.
      </p>
    </Card>
  );
}

function Sparkline({ values, height = 60 }: { values: number[]; height?: number }) {
  if (values.length < 2) {
    return (
      <div className="flex h-[60px] items-center text-xs text-muted-foreground">
        Not enough data yet to draw a chart.
      </div>
    );
  }
  const width = 100;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - 4 - ((v - min) / range) * (height - 8);
      return `${x},${y}`;
    })
    .join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-[60px] w-full text-foreground"
    >
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkfill)" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function CountTile({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </Link>
  );
}

function prettyPlatform(p: string): string {
  if (p === 'darwin') return 'macOS';
  if (p === 'win32') return 'Windows';
  if (p === 'linux') return 'Linux';
  return p;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatNumber(n: number, fractionDigits = 0): string {
  if (!Number.isFinite(n)) return '-';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(fractionDigits);
}

function formatLatency(ms: number): string {
  if (!ms) return '-';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)} ms`;
}

function formatDate(value: string | number): string {
  const d = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const now = Date.now();
  const diff = now - d.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`;
  if (diff < day) return `${Math.floor(diff / hour)} h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} d ago`;
  return d.toLocaleDateString();
}
