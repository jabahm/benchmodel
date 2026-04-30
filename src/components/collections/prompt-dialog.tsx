'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Play, Trash2, Copy, X, Code2, Save } from 'lucide-react';
import { useToast } from '@/components/ui/toaster';
import { useConfirm } from '@/components/ui/confirm';
import { useProviders, useProviderModels } from '@/hooks/use-providers';
import { safeJsonParse } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Assertion } from '@/lib/assertions/types';
import type { PromptRow } from '@/hooks/use-collections';
import { VariablesPanel } from './variables-panel';
import { AssertionsBuilder } from './assertions-builder';

type Mode = { kind: 'create' } | { kind: 'edit'; prompt: PromptRow };
type ActivePanel = 'try' | 'api' | null;

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  mode: Mode | null;
}

interface RunResult {
  output: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  assertionsPassed: boolean;
  error?: string;
}

export function PromptDialog({ open, onOpenChange, collectionId, mode }: PromptDialogProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const providers = useProviders();

  const initialPrompt = mode?.kind === 'edit' ? mode.prompt : null;
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [assertions, setAssertions] = useState<Assertion[]>([]);
  const [providerId, setProviderId] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  useEffect(() => {
    if (!open) return;
    setActivePanel(null);
    if (initialPrompt) {
      setName(initialPrompt.name);
      setSystemPrompt(initialPrompt.systemPrompt ?? '');
      setUserPrompt(initialPrompt.userPrompt);
      setVariables(safeJsonParse<Record<string, string>>(initialPrompt.variablesJson, {}));
      setAssertions(safeJsonParse<Assertion[]>(initialPrompt.assertionsJson, []));
      setProviderId(initialPrompt.defaultProviderId ?? '');
      setModel(initialPrompt.defaultModel ?? '');
    } else {
      setName('');
      setSystemPrompt('');
      setUserPrompt('');
      setVariables({});
      setAssertions([]);
      setProviderId('');
      setModel('');
    }
  }, [open, initialPrompt]);

  useEffect(() => {
    if (!open) return;
    if (!providerId && providers.data && providers.data.length > 0) {
      setProviderId(providers.data[0].id);
    }
  }, [open, providers.data, providerId]);

  const save = useMutation({
    mutationFn: async () => {
      const corePayload = {
        name,
        system: systemPrompt || undefined,
        user: userPrompt,
        variables: Object.keys(variables).length > 0 ? variables : undefined,
        assertions: assertions.length > 0 ? assertions : undefined,
      };
      if (initialPrompt) {
        const res = await fetch(`/api/prompts/${initialPrompt.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: corePayload.name,
            systemPrompt: corePayload.system ?? null,
            userPrompt: corePayload.user,
            variables: corePayload.variables ?? null,
            assertions: corePayload.assertions ?? null,
            defaultProviderId: providerId || null,
            defaultModel: model || null,
          }),
        });
        if (!res.ok) throw new Error('Save failed');
        return res.json();
      }
      const res = await fetch(`/api/collections/${collectionId}/prompts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(corePayload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Save failed');
      }
      const data = (await res.json()) as { prompt: { id: string } };
      if (data.prompt?.id && (providerId || model)) {
        await fetch(`/api/prompts/${data.prompt.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            defaultProviderId: providerId || null,
            defaultModel: model || null,
          }),
        });
      }
      return data;
    },
    onSuccess: () => {
      toast({ title: initialPrompt ? 'Prompt saved' : 'Prompt added' });
      qc.invalidateQueries({ queryKey: ['collection', collectionId] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!initialPrompt) return;
      const res = await fetch(`/api/prompts/${initialPrompt.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      toast({ title: 'Prompt deleted' });
      qc.invalidateQueries({ queryKey: ['collection', collectionId] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    },
  });

  const tryRun = useMutation({
    mutationFn: async (): Promise<RunResult> => {
      if (!initialPrompt) throw new Error('Save the prompt first.');
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          promptId: initialPrompt.id,
          providerId,
          model,
          variables,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Run failed');
      }
      return res.json();
    },
    onError: (err: Error) => {
      toast({ title: 'Run failed', description: err.message, variant: 'destructive' });
    },
  });

  const isEdit = Boolean(initialPrompt);
  const hasName = name.trim().length > 0;
  const hasUser = userPrompt.trim().length > 0;
  const hasBinding = Boolean(providerId && model.trim());
  const canSave = hasName && hasUser && !save.isPending;
  const canTryIt = isEdit && hasName && hasUser && hasBinding && !tryRun.isPending;
  const canApi = isEdit && hasName && hasUser && hasBinding;

  const triggerTry = () => {
    if (!canTryIt) return;
    setActivePanel('try');
    tryRun.mutate();
  };

  const toggleApi = () => {
    if (!canApi) return;
    setActivePanel((cur) => (cur === 'api' ? null : 'api'));
  };

  const closePanel = () => setActivePanel(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>{isEdit ? 'Edit prompt' : 'New prompt'}</DialogTitle>
          <DialogDescription>
            Define your prompt with variables and assertions. Try it or expose it as an HTTP
            endpoint from the footer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <SectionHeader title="Definition" />
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="prompt-name">Name</Label>
              <Input
                id="prompt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="classify_ticket"
                autoFocus={!isEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt-system">
                System prompt <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="prompt-system"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={3}
                placeholder="You are a classifier that replies with strict JSON."
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt-user">User prompt</Label>
              <Textarea
                id="prompt-user"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                rows={5}
                placeholder="Classify this ticket: {{ticket}}"
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Use double curly braces for variables, like{' '}
                <code className="rounded bg-muted px-1">{'{{ticket}}'}</code>.
              </p>
            </div>
          </div>

          <Separator />
          <SectionHeader title="Variables" subtitle="Default values for testing." />
          <VariablesPanel variables={variables} onChange={setVariables} />

          <Separator />
          <SectionHeader title="Assertions" subtitle="Validate model output on every run." />
          <AssertionsBuilder assertions={assertions} onChange={setAssertions} />

          <Separator />
          <SectionHeader
            title="Binding"
            subtitle="Pick the provider and model. Required for Try it and the HTTP API."
          />
          <BindingPicker
            providerId={providerId}
            model={model}
            onProviderChange={setProviderId}
            onModelChange={setModel}
          />
        </div>

        {activePanel === 'try' ? (
          <PanelShell title="Try it" onClose={closePanel}>
            <TryItPanel result={tryRun.data} loading={tryRun.isPending} onRerun={triggerTry} />
          </PanelShell>
        ) : null}

        {activePanel === 'api' ? (
          <PanelShell title="API endpoint" onClose={closePanel}>
            <ApiPanel
              promptId={initialPrompt?.id ?? ''}
              variables={variables}
              bindingPersisted={Boolean(
                initialPrompt?.defaultProviderId && initialPrompt?.defaultModel,
              )}
            />
          </PanelShell>
        ) : null}

        <DialogFooter className="border-t bg-background px-6 py-4 sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {isEdit ? (
              <Button
                type="button"
                size="icon"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Delete this prompt?',
                    description: 'Removes the prompt and breaks any HTTP endpoint that pointed to it.',
                    confirmLabel: 'Delete prompt',
                    destructive: true,
                  });
                  if (ok) remove.mutate();
                }}
                disabled={remove.isPending}
                title="Delete"
                aria-label="Delete prompt"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
            <Button
              type="button"
              size="icon"
              onClick={() => save.mutate()}
              disabled={!canSave}
              title={isEdit ? 'Save changes' : 'Create prompt'}
              aria-label={isEdit ? 'Save changes' : 'Create prompt'}
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              disabled={!canTryIt}
              onClick={triggerTry}
              title={!canTryIt && !isEdit ? 'Save the prompt first' : undefined}
              className={cn(
                'bg-[#FCFD81] text-[#0F1007] hover:bg-[#FCFD81]/90',
                activePanel === 'try' && 'ring-2 ring-[#FCFD81] ring-offset-2 ring-offset-background',
              )}
            >
              <Play className="mr-2 h-4 w-4" />
              {tryRun.isPending && activePanel === 'try' ? 'Running' : 'Try it'}
            </Button>
            <Button
              type="button"
              disabled={!canApi}
              onClick={toggleApi}
              title={!canApi && !isEdit ? 'Save the prompt first' : undefined}
              className={cn(
                'bg-white text-zinc-900 hover:bg-white/90',
                activePanel === 'api' && 'ring-2 ring-white ring-offset-2 ring-offset-background',
              )}
            >
              <Code2 className="mr-2 h-4 w-4" />
              API endpoint
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PanelShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t bg-muted/20 px-6 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="max-h-[40vh] overflow-y-auto">{children}</div>
    </div>
  );
}

function TryItPanel({
  result,
  loading,
  onRerun,
}: {
  result: RunResult | undefined;
  loading: boolean;
  onRerun: () => void;
}) {
  if (loading && !result) {
    return <p className="text-xs text-muted-foreground">Running.</p>;
  }
  if (!result) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 text-xs">
        <Badge variant="outline">{result.latencyMs} ms</Badge>
        {result.promptTokens !== undefined ? (
          <Badge variant="outline">in {result.promptTokens}</Badge>
        ) : null}
        {result.completionTokens !== undefined ? (
          <Badge variant="outline">out {result.completionTokens}</Badge>
        ) : null}
        <Badge variant={result.assertionsPassed ? 'success' : 'destructive'}>
          assertions {result.assertionsPassed ? 'pass' : 'fail'}
        </Badge>
        <span className="ml-auto" />
        <Button size="sm" variant="ghost" onClick={onRerun} disabled={loading}>
          {loading ? 'Running' : 'Run again'}
        </Button>
      </div>
      {result.error ? (
        <pre className="rounded bg-destructive/10 p-2 text-xs text-destructive whitespace-pre-wrap">
          {result.error}
        </pre>
      ) : (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded bg-background p-3 text-xs">
          {result.output}
        </pre>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

function BindingPicker({
  providerId,
  model,
  onProviderChange,
  onModelChange,
}: {
  providerId: string;
  model: string;
  onProviderChange: (v: string) => void;
  onModelChange: (v: string) => void;
}) {
  const providers = useProviders();
  const models = useProviderModels(providerId || null);

  if (!providers.data || providers.data.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Add a provider in the Providers page first.
      </p>
    );
  }

  return (
    <div className="grid gap-2 md:grid-cols-2">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Provider</Label>
        <select
          className={cn(
            'h-10 w-full rounded-md border bg-background px-3 text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          value={providerId}
          onChange={(e) => onProviderChange(e.target.value)}
        >
          <option value="">Pick a provider</option>
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
          list="binding-models"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          placeholder={models.isFetching ? 'Loading models' : 'Pick or type a model'}
          disabled={!providerId}
        />
        <datalist id="binding-models">
          {(models.data ?? []).map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

function ApiPanel({
  promptId,
  variables,
  bindingPersisted,
}: {
  promptId: string;
  variables: Record<string, string>;
  bindingPersisted: boolean;
}) {
  const { toast } = useToast();
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  const url = `${origin || 'http://localhost:3737'}/api/prompts/${promptId}/invoke`;

  const sampleVariables = useMemo(() => {
    const keys = Object.keys(variables);
    if (keys.length === 0) return {};
    const out: Record<string, string> = {};
    for (const k of keys) out[k] = variables[k];
    return out;
  }, [variables]);

  const body = JSON.stringify(
    Object.keys(sampleVariables).length > 0 ? { variables: sampleVariables } : {},
    null,
    2,
  );

  const curlSnippet = `curl -X POST ${url} \\
  -H 'content-type: application/json' \\
  -d '${JSON.stringify(
    Object.keys(sampleVariables).length > 0 ? { variables: sampleVariables } : {},
  )}'`;

  const pythonSnippet = `import requests

response = requests.post(
    ${JSON.stringify(url)},
    json=${
      Object.keys(sampleVariables).length > 0
        ? `{"variables": ${JSON.stringify(sampleVariables)}}`
        : '{}'
    },
)
print(response.json()["output"])`;

  const jsSnippet = `const res = await fetch(${JSON.stringify(url)}, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(${
    Object.keys(sampleVariables).length > 0
      ? `{ variables: ${JSON.stringify(sampleVariables)} }`
      : '{}'
  }),
});
const { output } = await res.json();`;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3">
      {!bindingPersisted ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-300">
          Save the prompt to lock the binding into the endpoint. The provider and model are read
          from the saved prompt at invocation time.
        </p>
      ) : null}

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Endpoint</Label>
        <div className="flex gap-2">
          <code className="flex-1 truncate rounded bg-background px-3 py-2 font-mono text-xs">
            POST {url}
          </code>
          <Button size="sm" variant="outline" onClick={() => copy(`POST ${url}`)}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Request body</Label>
        <pre className="rounded bg-background p-3 text-xs">{body}</pre>
      </div>

      <Tabs defaultValue="curl">
        <TabsList>
          <TabsTrigger value="curl">curl</TabsTrigger>
          <TabsTrigger value="python">Python</TabsTrigger>
          <TabsTrigger value="javascript">JavaScript</TabsTrigger>
        </TabsList>
        <TabsContent value="curl">
          <CodeBlock value={curlSnippet} onCopy={() => copy(curlSnippet)} />
        </TabsContent>
        <TabsContent value="python">
          <CodeBlock value={pythonSnippet} onCopy={() => copy(pythonSnippet)} />
        </TabsContent>
        <TabsContent value="javascript">
          <CodeBlock value={jsSnippet} onCopy={() => copy(jsSnippet)} />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        The endpoint returns{' '}
        <code className="rounded bg-background px-1">{`{ "output": string }`}</code>. Variables in
        the request body override the defaults stored on the prompt.
      </p>
    </div>
  );
}

function CodeBlock({ value, onCopy }: { value: string; onCopy: () => void }) {
  return (
    <div className="relative">
      <pre className="max-h-64 overflow-auto rounded bg-background p-3 text-xs">{value}</pre>
      <Button
        size="sm"
        variant="outline"
        className="absolute right-2 top-2"
        onClick={onCopy}
      >
        <Copy className="mr-1 h-3 w-3" /> Copy
      </Button>
    </div>
  );
}
