'use client';

import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateProvider } from '@/hooks/use-providers';
import { useToast } from '@/components/ui/toaster';
import { Plus, PlugZap, CheckCircle2, AlertCircle } from 'lucide-react';
import { ProviderLogo, type ProviderLogoKey } from './provider-logo';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['ollama', 'openai_compat']),
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const presets: Record<string, FormValues> = {
  ollama: { name: 'Local Ollama', type: 'ollama', baseUrl: 'http://localhost:11434' },
  vllm: { name: 'vLLM', type: 'openai_compat', baseUrl: 'http://localhost:8000/v1' },
  llamacpp: { name: 'llama.cpp', type: 'openai_compat', baseUrl: 'http://localhost:8080/v1' },
  lmstudio: { name: 'LM Studio', type: 'openai_compat', baseUrl: 'http://localhost:1234/v1' },
  together: { name: 'Together', type: 'openai_compat', baseUrl: 'https://api.together.xyz/v1' },
  groq: { name: 'Groq', type: 'openai_compat', baseUrl: 'https://api.groq.com/openai/v1' },
};

interface TestResult {
  ok: boolean;
  message: string;
}

export function ProviderForm({ onSaved }: { onSaved?: () => void }) {
  const create = useCreateProvider();
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: presets.ollama,
  });

  const watchedType = useWatch({ control: form.control, name: 'type' });
  const watchedBaseUrl = useWatch({ control: form.control, name: 'baseUrl' });

  const activePresetKey = useMemo(() => {
    return (
      Object.entries(presets).find(
        ([, p]) => p.type === watchedType && p.baseUrl === watchedBaseUrl,
      )?.[0] ?? null
    );
  }, [watchedType, watchedBaseUrl]);

  const applyPreset = (key: string) => {
    const preset = presets[key];
    if (!preset) return;
    form.reset(preset);
    setTestResult(null);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await create.mutateAsync(values);
      toast({ title: 'Provider added' });
      form.reset(presets.ollama);
      setTestResult(null);
      onSaved?.();
    } catch (err) {
      toast({
        title: 'Add failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const onTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const values = form.getValues();
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; models?: string[] };
      if (data.ok) {
        const count = data.models?.length ?? 0;
        setTestResult({
          ok: true,
          message:
            count > 0
              ? `Connected. ${count} model${count === 1 ? '' : 's'} available.`
              : 'Connected. No models pulled yet.',
        });
      } else {
        setTestResult({ ok: false, message: data.error ?? 'Could not connect.' });
      }
    } catch (err) {
      setTestResult({ ok: false, message: (err as Error).message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Quick presets</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(presets).map(([key, preset]) => {
            const active = activePresetKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                aria-pressed={active}
                className={cn(
                  'flex items-center gap-3 rounded-md border bg-card p-3 text-left transition-colors',
                  active
                    ? 'border-foreground/40 bg-accent/50'
                    : 'hover:border-foreground/20 hover:bg-accent/30',
                )}
              >
                <ProviderLogo keyName={key as ProviderLogoKey} size="md" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{preset.name}</div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {preset.baseUrl.replace(/^https?:\/\//, '')}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            aria-invalid={Boolean(form.formState.errors.name)}
            {...form.register('name')}
          />
          {form.formState.errors.name ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.name.message ?? 'Name is required.'}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={watchedType}
            onValueChange={(v) => form.setValue('type', v as FormValues['type'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ollama">Ollama</SelectItem>
              <SelectItem value="openai_compat">OpenAI compatible</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="baseUrl">Base URL</Label>
        <Input
          id="baseUrl"
          aria-invalid={Boolean(form.formState.errors.baseUrl)}
          {...form.register('baseUrl')}
        />
        {form.formState.errors.baseUrl ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.baseUrl.message ?? 'Enter a valid URL, including http(s)://.'}
          </p>
        ) : watchedType === 'openai_compat' ? (
          <p className="text-xs text-muted-foreground">
            For Together, Groq, vLLM, llama.cpp, or LM Studio. Include the path up to /v1.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Run Ollama locally with{' '}
            <code className="rounded bg-muted px-1">ollama serve</code> and pull a model with{' '}
            <code className="rounded bg-muted px-1">ollama pull llama3.1</code>.
          </p>
        )}
      </div>
      {watchedType === 'openai_compat' ? (
        <div className="space-y-2">
          <Label htmlFor="apiKey">API key (optional)</Label>
          <Input id="apiKey" type="password" placeholder="sk-..." {...form.register('apiKey')} />
        </div>
      ) : null}

      {testResult ? (
        <div
          className={cn(
            'flex items-start gap-2 rounded-md border p-2 text-xs',
            testResult.ok
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-destructive/30 bg-destructive/10 text-destructive',
          )}
        >
          {testResult.ok ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span>{testResult.message}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onTest} disabled={testing}>
          <PlugZap className="mr-2 h-4 w-4" />
          {testing ? 'Testing' : 'Test connection'}
        </Button>
        <Button type="submit" disabled={create.isPending}>
          <Plus className="mr-2 h-4 w-4" />
          {create.isPending ? 'Adding' : 'Add provider'}
        </Button>
      </div>
    </form>
  );
}
