'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { AssertionResult } from '@/lib/assertions/types';
import { safeJsonParse } from '@/lib/utils';
import { ProviderLogo, detectLogoKey } from '@/components/providers/provider-logo';

interface RunDetail {
  run: {
    id: string;
    promptId: string;
    providerId: string;
    modelName: string;
    output: string | null;
    paramsJson: string | null;
    latencyMs: number | null;
    promptTokens: number | null;
    completionTokens: number | null;
    costEstimate: number | null;
    assertionsPassed: boolean | null;
    assertionsResultJson: string | null;
    seed: number | null;
    errorMessage: string | null;
    createdAt: string | number;
  };
  prompt: {
    id: string;
    name: string;
    systemPrompt: string | null;
    userPrompt: string;
    variablesJson: string | null;
  } | null;
  provider: {
    id: string;
    name: string;
    type: 'ollama' | 'openai_compat';
    baseUrl: string;
  } | null;
}

interface RunDetailsSheetProps {
  runId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function RunDetailsSheet({ runId, onOpenChange }: RunDetailsSheetProps) {
  const open = Boolean(runId);
  const { data, isLoading } = useQuery({
    queryKey: ['run', runId],
    enabled: Boolean(runId),
    queryFn: async (): Promise<RunDetail> => {
      const res = await fetch(`/api/runs/${runId}`);
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-full overflow-y-auto p-0 sm:max-w-2xl"
      >
        {isLoading || !data ? (
          <div className="p-6 text-sm text-muted-foreground">Loading.</div>
        ) : (
          <RunDetailContent detail={data} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function RunDetailContent({ detail }: { detail: RunDetail }) {
  const { run, prompt, provider } = detail;
  const assertions = safeJsonParse<AssertionResult[]>(run.assertionsResultJson, []);
  const variables = prompt
    ? safeJsonParse<Record<string, string>>(prompt.variablesJson, {})
    : {};

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="space-y-3 border-b px-6 py-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {provider ? (
              <ProviderLogo
                keyName={detectLogoKey(provider.name, provider.type)}
                size="md"
              />
            ) : null}
            <div>
              <div className="font-mono text-sm">{run.modelName}</div>
              <div className="text-xs text-muted-foreground">
                {provider?.name ?? 'unknown provider'}
              </div>
            </div>
          </div>
          <Badge variant={run.assertionsPassed ? 'success' : 'destructive'}>
            {run.assertionsPassed ? 'pass' : 'fail'}
          </Badge>
        </div>
        <SheetTitle className="text-2xl">{prompt?.name ?? 'Run details'}</SheetTitle>
        <SheetDescription>{formatDate(run.createdAt)}</SheetDescription>
        <div className="flex flex-wrap gap-1 pt-1">
          <Badge variant="outline">{run.latencyMs ?? 0} ms</Badge>
          {run.promptTokens !== null ? (
            <Badge variant="outline">in {run.promptTokens}</Badge>
          ) : null}
          {run.completionTokens !== null ? (
            <Badge variant="outline">out {run.completionTokens}</Badge>
          ) : null}
          {run.costEstimate !== null ? (
            <Badge variant="outline">${run.costEstimate.toFixed(5)}</Badge>
          ) : null}
          {run.seed !== null ? <Badge variant="outline">seed {run.seed}</Badge> : null}
        </div>
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {run.errorMessage ? (
          <Section title="Error">
            <pre className="rounded bg-destructive/10 p-3 text-xs text-destructive whitespace-pre-wrap">
              {run.errorMessage}
            </pre>
          </Section>
        ) : null}

        <Section title="Output">
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-xs">
            {run.output || 'no output'}
          </pre>
        </Section>

        {assertions.length > 0 ? (
          <Section title="Assertions">
            <ul className="space-y-2">
              {assertions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 rounded-md border p-3 text-xs">
                  <Badge variant={a.passed ? 'success' : 'destructive'}>{a.type}</Badge>
                  <span className="text-muted-foreground">
                    {a.passed ? 'passed' : a.message ?? 'failed'}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {prompt ? (
          <>
            <Separator />
            <Section title="Prompt">
              {prompt.systemPrompt ? (
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    System
                  </div>
                  <pre className="whitespace-pre-wrap rounded bg-muted p-3 text-xs">
                    {prompt.systemPrompt}
                  </pre>
                </div>
              ) : null}
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  User
                </div>
                <pre className="whitespace-pre-wrap rounded bg-muted p-3 text-xs">
                  {prompt.userPrompt}
                </pre>
              </div>
              {Object.keys(variables).length > 0 ? (
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Variables
                  </div>
                  <ul className="space-y-1 text-xs">
                    {Object.entries(variables).map(([k, v]) => (
                      <li key={k} className="flex gap-2 font-mono">
                        <span className="text-muted-foreground">{k}</span>
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function formatDate(value: string | number): string {
  const d = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
