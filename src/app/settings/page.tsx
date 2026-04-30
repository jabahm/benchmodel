'use client';

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/toaster';
import { useConfirm } from '@/components/ui/confirm';
import { Trash2, Github, ExternalLink, Database, Cpu } from 'lucide-react';

interface SystemInfo {
  platform: string;
  arch: string;
  hostname: string;
  cpuModel: string;
  cpuCount: number;
  totalMemBytes: number;
  nodeVersion: string;
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();

  const system = useQuery({
    queryKey: ['system'],
    queryFn: async (): Promise<SystemInfo> => {
      const res = await fetch('/api/system');
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
  });

  const clearRuns = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/runs/clear', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to clear runs');
    },
    onSuccess: () => {
      toast({ title: 'Run history cleared' });
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['history-recent'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
  });

  const sys = system.data;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Runtime</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row
            icon={<Cpu className="h-4 w-4 text-muted-foreground" />}
            title="Host"
            description={
              sys
                ? `${sys.cpuModel} · ${sys.cpuCount} core${sys.cpuCount === 1 ? '' : 's'} · ${sys.platform} ${sys.arch}`
                : 'Loading.'
            }
          />
          <Separator />
          <Row
            icon={<Database className="h-4 w-4 text-muted-foreground" />}
            title="Storage"
            description="SQLite database. Path is set by DATABASE_URL or defaults to ~/.benchmodel/data.db in production and ./data.db in dev."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium">Clear run history</div>
                <p className="text-xs text-muted-foreground">
                  Removes every run from the history table. Collections and providers are kept.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Clear run history?',
                  description: 'Removes every run from the history table. Cannot be undone.',
                  confirmLabel: 'Clear runs',
                  destructive: true,
                });
                if (ok) clearRuns.mutate();
              }}
              disabled={clearRuns.isPending}
              className="text-destructive hover:text-destructive"
            >
              {clearRuns.isPending ? 'Clearing' : 'Clear runs'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent>
          <Row
            icon={<Github className="h-4 w-4 text-muted-foreground" />}
            title="Benchmodel"
            description="Postman for open source LLMs. Local first. Ollama first."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link
                  href="https://github.com/benchmodel/benchmodel"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  GitHub
                </Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
