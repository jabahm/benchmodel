'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ProviderRow {
  id: string;
  name: string;
  type: 'ollama' | 'openai_compat';
  baseUrl: string;
  hasApiKey: boolean;
  createdAt: number;
}

async function fetchProviders(): Promise<ProviderRow[]> {
  const res = await fetch('/api/providers');
  if (!res.ok) throw new Error('failed to fetch providers');
  const data = (await res.json()) as { providers: ProviderRow[] };
  return data.providers;
}

export function useProviders() {
  return useQuery({ queryKey: ['providers'], queryFn: fetchProviders });
}

export function useCreateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      type: 'ollama' | 'openai_compat';
      baseUrl: string;
      apiKey?: string;
    }) => {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('failed to create provider');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function useDeleteProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/providers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('failed to delete provider');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function useProviderModels(providerId: string | null) {
  return useQuery({
    queryKey: ['provider-models', providerId],
    enabled: Boolean(providerId),
    queryFn: async () => {
      const res = await fetch(`/api/providers/${providerId}/models`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'failed to fetch models');
      }
      const data = (await res.json()) as { models: string[] };
      return data.models;
    },
  });
}
