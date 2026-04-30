'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toaster';
import { useCollections } from '@/hooks/use-collections';

interface SaveAsPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: {
    systemPrompt?: string;
    userPrompt: string;
    variables?: Record<string, string>;
    providerId?: string;
    model?: string;
  };
}

const NEW_COLLECTION = '__new__';

export function SaveAsPromptDialog({ open, onOpenChange, payload }: SaveAsPromptDialogProps) {
  const collections = useCollections();
  const qc = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();

  const [collectionId, setCollectionId] = useState<string>('');
  const [newCollectionName, setNewCollectionName] = useState<string>('');
  const [name, setName] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setName('');
    setNewCollectionName('');
    if (collections.data && collections.data.length > 0) {
      setCollectionId(collections.data[0].id);
    } else {
      setCollectionId(NEW_COLLECTION);
    }
  }, [open, collections.data]);

  const save = useMutation({
    mutationFn: async () => {
      let targetId = collectionId;
      if (collectionId === NEW_COLLECTION) {
        const res = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: newCollectionName.trim() || 'Playground',
            format: 'yaml',
          }),
        });
        if (!res.ok) throw new Error('Could not create collection');
        const data = (await res.json()) as { collection: { id: string } };
        targetId = data.collection.id;
      }

      const promptRes = await fetch(`/api/collections/${targetId}/prompts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'untitled',
          system: payload.systemPrompt || undefined,
          user: payload.userPrompt,
          variables:
            payload.variables && Object.keys(payload.variables).length > 0
              ? payload.variables
              : undefined,
        }),
      });
      if (!promptRes.ok) {
        const err = await promptRes.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Could not save prompt');
      }
      const promptData = (await promptRes.json()) as { prompt: { id: string } };

      if (payload.providerId && payload.model) {
        await fetch(`/api/prompts/${promptData.prompt.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            defaultProviderId: payload.providerId,
            defaultModel: payload.model,
          }),
        });
      }

      return { collectionId: targetId, promptId: promptData.prompt.id };
    },
    onSuccess: ({ collectionId: cid, promptId }) => {
      toast({ title: 'Saved as prompt' });
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.invalidateQueries({ queryKey: ['collection', cid] });
      onOpenChange(false);
      router.push(`/collections/${cid}?prompt=${promptId}`);
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  const canSave =
    name.trim().length > 0 &&
    payload.userPrompt.trim().length > 0 &&
    (collectionId !== NEW_COLLECTION || newCollectionName.trim().length > 0) &&
    !save.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as prompt</DialogTitle>
          <DialogDescription>
            Persist the playground state as a reusable prompt in a collection.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="save-prompt-name">Prompt name</Label>
            <Input
              id="save-prompt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my_prompt"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Collection</Label>
            <Select value={collectionId} onValueChange={setCollectionId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(collections.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_COLLECTION}>+ New collection</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {collectionId === NEW_COLLECTION ? (
            <div className="space-y-2">
              <Label htmlFor="save-new-collection">New collection name</Label>
              <Input
                id="save-new-collection"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Playground"
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => save.mutate()} disabled={!canSave}>
            {save.isPending ? 'Saving' : 'Save prompt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
