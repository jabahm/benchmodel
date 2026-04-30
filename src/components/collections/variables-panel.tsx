'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';

export interface VariablesPanelProps {
  variables: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

export function VariablesPanel({ variables, onChange }: VariablesPanelProps) {
  const entries = Object.entries(variables);

  const updateKey = (oldKey: string, newKey: string) => {
    if (newKey === oldKey) return;
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(variables)) {
      if (k === oldKey) next[newKey] = v;
      else next[k] = v;
    }
    onChange(next);
  };

  const updateValue = (key: string, value: string) => {
    onChange({ ...variables, [key]: value });
  };

  const remove = (key: string) => {
    const next = { ...variables };
    delete next[key];
    onChange(next);
  };

  const add = () => {
    let i = 1;
    let key = `var${i}`;
    while (key in variables) {
      i += 1;
      key = `var${i}`;
    }
    onChange({ ...variables, [key]: '' });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Variables</Label>
        <Button size="sm" variant="ghost" onClick={add}>
          <Plus className="mr-1 h-3 w-3" /> Add
        </Button>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Use double curly braces to interpolate, like {'{{variable}}'}.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[140px_1fr_auto] gap-2">
              <Input value={k} onChange={(e) => updateKey(k, e.target.value)} />
              <Input value={v} onChange={(e) => updateValue(k, e.target.value)} />
              <Button size="icon" variant="ghost" onClick={() => remove(k)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
