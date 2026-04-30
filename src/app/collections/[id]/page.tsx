'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCollection, useDeleteCollection, type PromptRow } from '@/hooks/use-collections';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Plus, FileText, Trash2, Play, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PromptDialog } from '@/components/collections/prompt-dialog';
import { RunDetailsSheet } from '@/components/history/run-details-sheet';
import { safeJsonParse, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toaster';
import { useConfirm } from '@/components/ui/confirm';
import { Skeleton } from '@/components/ui/skeleton';

export default function CollectionDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading.</p>}>
      <CollectionDetailInner />
    </Suspense>
  );
}

function CollectionDetailInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const id = params.id;
  const { data, isLoading } = useCollection(id);
  const del = useDeleteCollection();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptRow | null>(null);
  const [runDetailsId, setRunDetailsId] = useState<string | null>(null);

  const promptParam = search.get('prompt');
  useEffect(() => {
    if (!promptParam || !data) return;
    const target = data.prompts.find((p) => p.id === promptParam);
    if (target) setEditingPrompt(target);
  }, [promptParam, data]);

  const onDelete = async () => {
    if (!data) return;
    const ok = await confirm({
      title: `Delete "${data.collection.name}"?`,
      description: `This will also remove ${data.prompts.length} prompt${data.prompts.length === 1 ? '' : 's'}. Cannot be undone.`,
      confirmLabel: 'Delete collection',
      destructive: true,
    });
    if (!ok) return;
    try {
      await del.mutateAsync(data.collection.id);
      toast({ title: 'Collection deleted' });
      router.push('/collections');
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[140px]" />
          ))}
        </div>
      </div>
    );
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground">Not found.</p>;
  }

  const { collection, prompts } = data;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link href="/collections">
            <ArrowLeft className="mr-2 h-4 w-4" /> All collections
          </Link>
        </Button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">{collection.name}</h1>
              <Badge variant="secondary">{collection.format.toUpperCase()}</Badge>
            </div>
            {collection.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{collection.description}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              disabled={del.isPending}
              title="Delete collection"
              aria-label="Delete collection"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button asChild variant="outline">
              <a
                href={`/api/collections/${collection.id}/export?format=${collection.format}`}
                download
              >
                <Download className="mr-2 h-4 w-4" /> Export
              </a>
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New prompt
            </Button>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Prompts
          </h2>
          <span className="text-xs text-muted-foreground">{prompts.length}</span>
        </div>
        {prompts.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-base font-semibold">No prompts yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first prompt to start testing models.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New prompt
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prompts.map((p) => (
              <PromptCard
                key={p.id}
                prompt={p}
                onClick={() => setEditingPrompt(p)}
                onRunComplete={(runId) => setRunDetailsId(runId)}
              />
            ))}
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <Plus className="h-5 w-5" />
              New prompt
            </button>
          </div>
        )}
      </div>

      <PromptDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        collectionId={collection.id}
        mode={createOpen ? { kind: 'create' } : null}
      />
      <PromptDialog
        open={Boolean(editingPrompt)}
        onOpenChange={(o) => {
          if (!o) setEditingPrompt(null);
        }}
        collectionId={collection.id}
        mode={editingPrompt ? { kind: 'edit', prompt: editingPrompt } : null}
      />
      <RunDetailsSheet
        runId={runDetailsId}
        onOpenChange={(o) => {
          if (!o) setRunDetailsId(null);
        }}
      />
    </div>
  );
}

function PromptCard({
  prompt,
  onClick,
  onRunComplete,
}: {
  prompt: PromptRow;
  onClick: () => void;
  onRunComplete: (runId: string) => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const variables = safeJsonParse<Record<string, string>>(prompt.variablesJson, {});
  const assertions = safeJsonParse<unknown[]>(prompt.assertionsJson, []);
  const variableCount = Object.keys(variables).length;
  const canRun = Boolean(prompt.defaultProviderId && prompt.defaultModel);

  const quickRun = useMutation({
    mutationFn: async (): Promise<{ runId: string }> => {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          promptId: prompt.id,
          providerId: prompt.defaultProviderId,
          model: prompt.defaultModel,
          variables,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Run failed');
      }
      return res.json();
    },
    onSuccess: ({ runId }) => {
      qc.invalidateQueries({ queryKey: ['history-recent'] });
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      onRunComplete(runId);
    },
    onError: (err: Error) => {
      toast({ title: 'Run failed', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative flex cursor-pointer flex-col gap-3 p-5 transition-all hover:border-foreground/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (canRun && !quickRun.isPending) quickRun.mutate();
        }}
        disabled={!canRun || quickRun.isPending}
        title={canRun ? 'Run with default provider and model' : 'Set provider and model first'}
        aria-label="Quick run"
        className={cn(
          'absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border opacity-0 transition-opacity',
          'bg-[#FCFD81] text-[#0F1007] hover:bg-[#FCFD81]/90',
          'group-hover:opacity-100 focus-visible:opacity-100',
          quickRun.isPending && 'opacity-100',
          (!canRun || quickRun.isPending) && 'cursor-not-allowed',
          !canRun && 'bg-muted text-muted-foreground hover:bg-muted',
        )}
      >
        {quickRun.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </button>
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-foreground/10">
          <FileText className="h-4 w-4" />
        </div>
      </div>
      <div className="min-w-0">
        <div className="font-semibold leading-tight">{prompt.name}</div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{prompt.userPrompt}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {variableCount > 0 ? (
          <Badge variant="outline" className="text-[10px]">
            {variableCount} var{variableCount === 1 ? '' : 's'}
          </Badge>
        ) : null}
        {assertions.length > 0 ? (
          <Badge variant="outline" className="text-[10px]">
            {assertions.length} assertion{assertions.length === 1 ? '' : 's'}
          </Badge>
        ) : null}
      </div>
    </Card>
  );
}
