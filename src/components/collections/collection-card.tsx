'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen } from 'lucide-react';
import type { CollectionRow } from '@/hooks/use-collections';

export function CollectionCard({ collection }: { collection: CollectionRow }) {
  return (
    <Link href={`/collections/${collection.id}`} className="block">
      <Card className="group flex h-full cursor-pointer flex-col gap-3 p-5 transition-all hover:border-foreground/20 hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-foreground/10">
            <FolderOpen className="h-4 w-4" />
          </div>
          <Badge variant="secondary">{collection.format.toUpperCase()}</Badge>
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-tight">{collection.name}</h3>
          {collection.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {collection.description}
            </p>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
