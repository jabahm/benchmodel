'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ProviderForm } from '@/components/providers/provider-form';
import { ProviderList } from '@/components/providers/provider-list';

export default function ProvidersPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Providers</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add provider
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add a provider</DialogTitle>
              <DialogDescription>
                Pick a preset or fill the form. Use Test connection to verify reachability before
                saving.
              </DialogDescription>
            </DialogHeader>
            <ProviderForm onSaved={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <ProviderList />
    </div>
  );
}
