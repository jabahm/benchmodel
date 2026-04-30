'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useProviders, useProviderModels } from '@/hooks/use-providers';
import { VariablesPanel } from '@/components/collections/variables-panel';
import { useToast } from '@/components/ui/toaster';
import { Play, Eraser, Sparkles, Save, Square } from 'lucide-react';
import { SaveAsPromptDialog } from '@/components/collections/save-as-prompt-dialog';

interface RunMetrics {
  latencyMs: number | null;
}

export default function PlaygroundPage() {
  const providers = useProviders();
  const { toast } = useToast();

  const [providerId, setProviderId] = useState('');
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState('0.7');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [saveOpen, setSaveOpen] = useState(false);

  const [output, setOutput] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [metrics, setMetrics] = useState<RunMetrics | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const models = useProviderModels(providerId || null);

  useEffect(() => {
    if (!providerId && providers.data?.[0]) setProviderId(providers.data[0].id);
  }, [providers.data, providerId]);

  useEffect(() => {
    if (!model && models.data && models.data.length > 0) {
      setModel(models.data[0]);
    }
  }, [models.data, model]);

  const interpolated = useMemo(() => {
    return userPrompt.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key: string) =>
      Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : `{{${key}}}`,
    );
  }, [userPrompt, variables]);

  const runStream = async () => {
    const tempNum = Number(temperature);
    setOutput('');
    setStreamError(null);
    setMetrics(null);
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/playground/run?stream=true', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          providerId,
          model: model.trim(),
          systemPrompt: systemPrompt || undefined,
          userPrompt,
          variables: Object.keys(variables).length > 0 ? variables : undefined,
          params: Number.isFinite(tempNum) ? { temperature: tempNum } : undefined,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Run failed');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const event of events) {
          for (const line of event.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (!data) continue;
            try {
              const parsed = JSON.parse(data) as
                | { type: 'delta'; value: string }
                | { type: 'done'; latencyMs: number }
                | { type: 'error'; message: string };
              if (parsed.type === 'delta') {
                acc += parsed.value;
                setOutput(acc);
              } else if (parsed.type === 'done') {
                setMetrics({ latencyMs: parsed.latencyMs });
              } else if (parsed.type === 'error') {
                setStreamError(parsed.message);
              }
            } catch {
              // ignore malformed event
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const message = (err as Error).message;
      setStreamError(message);
      toast({ title: 'Run failed', description: message, variant: 'destructive' });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  const clear = () => {
    setSystemPrompt('');
    setUserPrompt('');
    setVariables({});
    setOutput('');
    setStreamError(null);
    setMetrics(null);
  };

  const canRun =
    Boolean(providerId) && model.trim().length > 0 && userPrompt.trim().length > 0 && !streaming;
  const canSavePrompt = userPrompt.trim().length > 0;

  if (!providers.data || providers.data.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Playground</h1>
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Add a provider first</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The playground needs a configured provider to call models against.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Playground</h1>
        <Button variant="outline" onClick={() => setSaveOpen(true)} disabled={!canSavePrompt}>
          <Save className="mr-2 h-4 w-4" /> Save as prompt
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_140px_auto]">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Provider</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
            >
              {providers.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Model</Label>
            <Input
              list="playground-models"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={models.isFetching ? 'Loading models' : 'Pick or type a model'}
            />
            <datalist id="playground-models">
              {(models.data ?? []).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Temperature</Label>
            <Input
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div className="flex items-end gap-2">
            {streaming ? (
              <Button
                type="button"
                onClick={stop}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Square className="mr-2 h-4 w-4" /> Stop
              </Button>
            ) : (
              <Button
                type="button"
                onClick={runStream}
                disabled={!canRun}
                className="bg-[#FCFD81] text-[#0F1007] hover:bg-[#FCFD81]/90"
              >
                <Play className="mr-2 h-4 w-4" /> Run
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={clear} title="Clear">
              <Eraser className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="pg-system">
              System prompt <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="pg-system"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              placeholder="You are a concise assistant."
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pg-user">User prompt</Label>
            <Textarea
              id="pg-user"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={8}
              placeholder="Summarize the following: {{text}}"
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Use double curly braces for variables, like{' '}
              <code className="rounded bg-muted px-1">{'{{text}}'}</code>.
            </p>
          </div>
          <Separator />
          <VariablesPanel variables={variables} onChange={setVariables} />
          {userPrompt && Object.keys(variables).length > 0 ? (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Interpolated user prompt</Label>
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">
                  {interpolated}
                </pre>
              </div>
            </>
          ) : null}
        </Card>

        <Card className="flex flex-col gap-3 p-5 md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-2rem)]">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Output</Label>
            <div className="flex items-center gap-2">
              {streaming ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  streaming
                </span>
              ) : null}
              {metrics?.latencyMs ? (
                <Badge variant="outline">{metrics.latencyMs} ms</Badge>
              ) : null}
            </div>
          </div>
          {streamError ? (
            <pre className="flex-1 overflow-auto whitespace-pre-wrap rounded bg-destructive/10 p-3 text-xs text-destructive">
              {streamError}
            </pre>
          ) : output ? (
            <pre className="flex-1 min-h-[12rem] overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-xs">
              {output}
              {streaming ? <span className="ml-0.5 animate-pulse">▍</span> : null}
            </pre>
          ) : streaming ? (
            <pre className="flex-1 overflow-auto rounded bg-muted p-3 text-xs text-muted-foreground">
              Generating.
            </pre>
          ) : (
            <div className="flex flex-1 min-h-[12rem] items-center justify-center rounded border border-dashed text-xs text-muted-foreground">
              Run a prompt to see the output here.
            </div>
          )}
        </Card>
      </div>

      <SaveAsPromptDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        payload={{
          systemPrompt: systemPrompt || undefined,
          userPrompt,
          variables,
          providerId,
          model: model.trim() || undefined,
        }}
      />
    </div>
  );
}
