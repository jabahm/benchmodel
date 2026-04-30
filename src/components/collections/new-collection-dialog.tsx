'use client';

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toaster';

interface NewCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewCollectionDialog({ open, onOpenChange }: NewCollectionDialogProps) {
  const qc = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<'yaml' | 'json'>('yaml');

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined, format }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to create');
      }
      return res.json() as Promise<{ collection: { id: string } }>;
    },
    onSuccess: ({ collection }) => {
      toast({ title: 'Collection created' });
      qc.invalidateQueries({ queryKey: ['collections'] });
      reset();
      onOpenChange(false);
      router.push(`/collections/${collection.id}`);
    },
    onError: (err: Error) => {
      toast({ title: 'Create failed', description: err.message, variant: 'destructive' });
    },
  });

  const reset = () => {
    setName('');
    setDescription('');
    setFormat('yaml');
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
            <DialogDescription>
              Give your collection a name. You can add prompts to it once it is created.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-collection-name">Name</Label>
              <Input
                id="new-collection-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer support classifier"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-collection-description">Description</Label>
              <Textarea
                id="new-collection-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this collection for?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Storage format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as 'yaml' | 'json')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yaml">YAML</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Controls the format used when you export this collection.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              {create.isPending ? 'Creating' : 'Create collection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
