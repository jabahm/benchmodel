'use client';

import { useState } from 'react';
import { useCollections, useImportCollection } from '@/hooks/use-collections';
import { CollectionCard } from './collection-card';
import { NewCollectionDialog } from './new-collection-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';
import { Plus, FolderOpen, Upload } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const exampleSource = `name: "Customer support classifier"
description: "Tests for routing tickets"
prompts:
  - name: "classify_ticket"
    system: "You are a classifier. Reply with JSON."
    user: "Classify this ticket: {{ticket}}"
    variables:
      ticket: "My order is late"
    assertions:
      - type: contains
        value: "shipping"
`;

export function CollectionList() {
  const { data, isLoading } = useCollections();
  const importMutation = useImportCollection();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [source, setSource] = useState(exampleSource);

  const onImport = async () => {
    try {
      await importMutation.mutateAsync({ source });
      toast({ title: 'Collection imported' });
      setImportOpen(false);
    } catch (err) {
      toast({
        title: 'Import failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Collections</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[#FCFD81] text-[#0F1007] hover:bg-[#FCFD81]/90"
          >
            <Plus className="mr-2 h-4 w-4" /> New collection
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-base font-semibold">No collections yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first collection to start writing prompts.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New collection
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <CollectionCard key={c.id} collection={c} />
          ))}
        </div>
      )}

      <NewCollectionDialog open={createOpen} onOpenChange={setCreateOpen} />

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import a collection</DialogTitle>
            <DialogDescription>
              Already have a collection in YAML or JSON? Paste it here and we will validate and import it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="import-source">Source</Label>
            <Textarea
              id="import-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              rows={16}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onImport} disabled={importMutation.isPending}>
              {importMutation.isPending ? 'Importing' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
