'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface CollectionRow {
  id: string;
  name: string;
  description: string | null;
  format: 'yaml' | 'json';
  sourcePath: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PromptRow {
  id: string;
  collectionId: string;
  name: string;
  systemPrompt: string | null;
  userPrompt: string;
  variablesJson: string | null;
  assertionsJson: string | null;
  defaultProviderId: string | null;
  defaultModel: string | null;
  createdAt: number;
}

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: async (): Promise<CollectionRow[]> => {
      const res = await fetch('/api/collections');
      if (!res.ok) throw new Error('failed to fetch collections');
      const data = (await res.json()) as { collections: CollectionRow[] };
      return data.collections;
    },
  });
}

export function useCollection(id: string | null) {
  return useQuery({
    queryKey: ['collection', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<{ collection: CollectionRow; prompts: PromptRow[] }> => {
      const res = await fetch(`/api/collections/${id}`);
      if (!res.ok) throw new Error('failed to fetch collection');
      return res.json();
    },
  });
}

export function useImportCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { source: string; format?: 'yaml' | 'json' }) => {
      const res = await fetch('/api/collections/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === 'string' ? data.error : 'failed to import');
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('failed to delete');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  });
}

