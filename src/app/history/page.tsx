'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { History as HistoryIcon } from 'lucide-react';
import { RunDetailsSheet } from '@/components/history/run-details-sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface RunRow {
  id: string;
  promptId: string;
  providerId: string;
  modelName: string;
  output: string | null;
  latencyMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  costEstimate: number | null;
  assertionsPassed: boolean | null;
  errorMessage: string | null;
  createdAt: string | number;
}

type Status = 'all' | 'pass' | 'fail';
type Range = 'all' | '1h' | '24h' | '7d';

const STATUS_OPTIONS: Array<{ value: Status; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
];

const RANGE_OPTIONS: Array<{ value: Range; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: '1h', label: 'Last hour' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
];

function formatDate(value: string | number): string {
  const d = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString();
}

function toMs(value: string | number): number {
  const d = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return d.getTime();
}

export default function HistoryPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [model, setModel] = useState<string>('all');
  const [status, setStatus] = useState<Status>('all');
  const [range, setRange] = useState<Range>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: async (): Promise<{ runs: RunRow[] }> => {
      const res = await fetch('/api/history?limit=200');
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
  });

  const allRuns = useMemo(() => data?.runs ?? [], [data]);

  const models = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRuns) set.add(r.modelName);
    return Array.from(set).sort();
  }, [allRuns]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff =
      range === '1h' ? now - 60 * 60 * 1000
        : range === '24h' ? now - 24 * 60 * 60 * 1000
        : range === '7d' ? now - 7 * 24 * 60 * 60 * 1000
        : null;
    return allRuns.filter((r) => {
      if (model !== 'all' && r.modelName !== model) return false;
      if (status === 'pass' && r.assertionsPassed !== true) return false;
      if (status === 'fail' && r.assertionsPassed !== false) return false;
      if (cutoff !== null && toMs(r.createdAt) < cutoff) return false;
      return true;
    });
  }, [allRuns, model, status, range]);

  const filtersActive = model !== 'all' || status !== 'all' || range !== 'all';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">History</h1>

      {!isLoading && allRuns.length > 0 ? (
        <Card className="flex flex-wrap items-end gap-3 p-4">
          <FilterControl label="Model">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All models</SelectItem>
                {models.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterControl>
          <FilterControl label="Status">
            <SegmentedControl
              value={status}
              onChange={(v) => setStatus(v as Status)}
              options={STATUS_OPTIONS}
            />
          </FilterControl>
          <FilterControl label="Range">
            <SegmentedControl
              value={range}
              onChange={(v) => setRange(v as Range)}
              options={RANGE_OPTIONS}
            />
          </FilterControl>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {filtered.length} of {allRuns.length}
            </span>
            {filtersActive ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setModel('all');
                  setStatus('all');
                  setRange('all');
                }}
              >
                Reset
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="overflow-hidden">
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      ) : allRuns.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <HistoryIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-base font-semibold">No runs yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Open a collection, pick a prompt, and run it against a model.
            </p>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <p className="text-sm font-medium">No runs match the current filters.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setModel('all');
              setStatus('all');
              setRange('all');
            }}
          >
            Reset filters
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Assertions</TableHead>
                <TableHead>Output</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow
                  key={r.id}
                  onClick={() => setActiveId(r.id)}
                  className="cursor-pointer"
                  data-state={activeId === r.id ? 'selected' : undefined}
                >
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.modelName}</TableCell>
                  <TableCell>{r.latencyMs ?? '-'} ms</TableCell>
                  <TableCell className="text-xs">
                    {(r.promptTokens ?? 0)} / {(r.completionTokens ?? 0)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.costEstimate !== null ? `$${r.costEstimate.toFixed(5)}` : '-'}
                  </TableCell>
                  <TableCell>
                    {r.assertionsPassed === null ? (
                      '-'
                    ) : (
                      <Badge variant={r.assertionsPassed ? 'success' : 'destructive'}>
                        {r.assertionsPassed ? 'pass' : 'fail'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-md truncate text-xs">
                    {r.errorMessage ?? r.output ?? ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <RunDetailsSheet
        runId={activeId}
        onOpenChange={(open) => {
          if (!open) setActiveId(null);
        }}
      />
    </div>
  );
}

function FilterControl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="inline-flex h-10 items-center rounded-md border bg-background p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-sm px-3 py-1 text-xs transition-colors',
            value === opt.value
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
