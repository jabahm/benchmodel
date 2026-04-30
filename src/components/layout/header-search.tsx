'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useCollections, type PromptRow } from '@/hooks/use-collections';
import { cn } from '@/lib/utils';

interface SearchResult {
  type: 'collection' | 'prompt';
  id: string;
  href: string;
  label: string;
  hint: string;
}

export function HeaderSearch() {
  const router = useRouter();
  const collections = useCollections();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (!isCmdK) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      const editable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (e.target as HTMLElement | null)?.isContentEditable;
      if (editable && document.activeElement !== inputRef.current) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const collectionIds = useMemo(
    () => (collections.data ?? []).map((c) => c.id),
    [collections.data],
  );

  const promptsQuery = useQuery({
    queryKey: ['header-search-prompts', collectionIds],
    enabled: collectionIds.length > 0,
    queryFn: async (): Promise<PromptRow[]> => {
      const all: PromptRow[] = [];
      for (const id of collectionIds) {
        const res = await fetch(`/api/collections/${id}`);
        if (!res.ok) continue;
        const data = (await res.json()) as { prompts: PromptRow[] };
        all.push(...data.prompts);
      }
      return all;
    },
    staleTime: 30_000,
  });

  const results = useMemo<SearchResult[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const out: SearchResult[] = [];
    for (const c of collections.data ?? []) {
      if (c.name.toLowerCase().includes(term) || (c.description ?? '').toLowerCase().includes(term)) {
        out.push({
          type: 'collection',
          id: c.id,
          href: `/collections/${c.id}`,
          label: c.name,
          hint: c.description ?? 'collection',
        });
      }
    }
    for (const p of promptsQuery.data ?? []) {
      if (
        p.name.toLowerCase().includes(term) ||
        p.userPrompt.toLowerCase().includes(term) ||
        (p.systemPrompt ?? '').toLowerCase().includes(term)
      ) {
        const parent = collections.data?.find((c) => c.id === p.collectionId);
        out.push({
          type: 'prompt',
          id: p.id,
          href: `/collections/${p.collectionId}?prompt=${p.id}`,
          label: p.name,
          hint: parent ? `prompt in ${parent.name}` : 'prompt',
        });
      }
    }
    return out.slice(0, 8);
  }, [q, collections.data, promptsQuery.data]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    setActiveIdx(0);
  }, [q, results.length]);

  const showDropdown = open && q.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showDropdown) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            const r = results[activeIdx];
            if (r) {
              setOpen(false);
              setQ('');
              router.push(r.href);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder="Search collections and prompts"
        className="h-9 pl-8 pr-12"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden h-5 -translate-y-1/2 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
        <span className="text-xs">⌘</span>K
      </kbd>
      {showDropdown ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No matches.</div>
          ) : (
            <ul className="max-h-72 overflow-auto py-1">
              {results.map((r, idx) => (
                <li key={`${r.type}-${r.id}`}>
                  <Link
                    href={r.href}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => {
                      setOpen(false);
                      setQ('');
                    }}
                    className={cn(
                      'flex flex-col px-3 py-2 text-sm',
                      idx === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/40',
                    )}
                  >
                    <span className="font-medium">{r.label}</span>
                    <span className="text-xs text-muted-foreground">{r.hint}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
