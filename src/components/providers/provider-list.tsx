'use client';

import {
  useProviders,
  useDeleteProvider,
  useProviderModels,
  type ProviderRow,
} from '@/hooks/use-providers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trash2, RefreshCcw, AlertCircle, Cpu } from 'lucide-react';
import { ProviderLogo, detectLogoKey } from './provider-logo';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirm } from '@/components/ui/confirm';

export function ProviderList() {
  const providers = useProviders();
  if (providers.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[200px]" />
        ))}
      </div>
    );
  }
  if (!providers.data || providers.data.length === 0) {
    return (
      <Card>
        <div className="py-10 text-center text-sm text-muted-foreground">
          No providers configured yet. Click Add provider to pick a preset.
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {providers.data.map((p) => (
        <ProviderCard key={p.id} provider={p} />
      ))}
    </div>
  );
}

function ProviderCard({ provider }: { provider: ProviderRow }) {
  const del = useDeleteProvider();
  const models = useProviderModels(provider.id);
  const confirm = useConfirm();

  const reachable = !models.error && !models.isLoading;
  const status = models.error
    ? { label: 'unreachable', className: 'bg-destructive/15 text-destructive' }
    : models.isLoading || models.isFetching
      ? { label: 'checking', className: 'bg-muted text-muted-foreground' }
      : { label: 'connected', className: 'bg-emerald-500/15 text-emerald-300' };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="flex min-w-0 items-center gap-3">
          <ProviderLogo keyName={detectLogoKey(provider.name, provider.type)} size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-base font-semibold">{provider.name}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', status.className)}>
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{provider.type}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate font-mono">{provider.baseUrl.replace(/^https?:\/\//, '')}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => models.refetch()}
            disabled={models.isFetching}
            title="Refresh models"
            aria-label="Refresh models"
          >
            <RefreshCcw className={cn('h-4 w-4', models.isFetching && 'animate-spin')} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={async () => {
              const ok = await confirm({
                title: `Delete provider "${provider.name}"?`,
                description: 'Prompts and runs that depend on it will be cascaded.',
                confirmLabel: 'Delete provider',
                destructive: true,
              });
              if (ok) del.mutate(provider.id);
            }}
            title="Delete provider"
            aria-label="Delete provider"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-2 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Cpu className="h-3 w-3" />
            <span className="uppercase tracking-wide">Models</span>
          </div>
          {reachable && models.data ? (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {models.data.length}
            </span>
          ) : null}
        </div>
        {models.error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{(models.error as Error).message}</span>
          </div>
        ) : models.isLoading && !models.data ? (
          <p className="text-xs text-muted-foreground">Listing models.</p>
        ) : models.data && models.data.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {models.data.map((m) => (
              <Badge key={m} variant="secondary" className="font-mono">
                {m}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No models found. For Ollama, pull one with{' '}
            <code className="rounded bg-muted px-1">ollama pull llama3.1</code>.
          </p>
        )}
      </div>
    </Card>
  );
}
