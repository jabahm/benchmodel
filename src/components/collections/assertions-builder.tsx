'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import type { Assertion } from '@/lib/assertions/types';

export interface AssertionsBuilderProps {
  assertions: Assertion[];
  onChange: (next: Assertion[]) => void;
}

export function AssertionsBuilder({ assertions, onChange }: AssertionsBuilderProps) {
  const update = (idx: number, next: Assertion) => {
    const copy = assertions.slice();
    copy[idx] = next;
    onChange(copy);
  };

  const remove = (idx: number) => {
    onChange(assertions.filter((_, i) => i !== idx));
  };

  const add = () => {
    onChange([...assertions, { type: 'contains', value: '' }]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Assertions</Label>
        <Button size="sm" variant="ghost" onClick={add}>
          <Plus className="mr-1 h-3 w-3" /> Add
        </Button>
      </div>
      {assertions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Add assertions to validate model output during runs.
        </p>
      ) : (
        <div className="space-y-3">
          {assertions.map((a, idx) => (
            <div key={idx} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Select
                  value={a.type}
                  onValueChange={(value) => {
                    if (value === 'contains') update(idx, { type: 'contains', value: '' });
                    else if (value === 'regex') update(idx, { type: 'regex', pattern: '' });
                    else if (value === 'json_schema')
                      update(idx, { type: 'json_schema', schema: { type: 'object' } });
                  }}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">contains</SelectItem>
                    <SelectItem value="regex">regex</SelectItem>
                    <SelectItem value="json_schema">json_schema</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1" />
                <Button size="icon" variant="ghost" onClick={() => remove(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {a.type === 'contains' ? (
                <Input
                  placeholder="value"
                  value={a.value}
                  onChange={(e) => update(idx, { ...a, value: e.target.value })}
                />
              ) : null}
              {a.type === 'regex' ? (
                <div className="grid grid-cols-[1fr_120px] gap-2">
                  <Input
                    placeholder="pattern"
                    value={a.pattern}
                    onChange={(e) => update(idx, { ...a, pattern: e.target.value })}
                  />
                  <Input
                    placeholder="flags"
                    value={a.flags ?? ''}
                    onChange={(e) => update(idx, { ...a, flags: e.target.value || undefined })}
                  />
                </div>
              ) : null}
              {a.type === 'json_schema' ? (
                <Textarea
                  className="font-mono text-xs"
                  rows={6}
                  value={JSON.stringify(a.schema, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value) as Record<string, unknown>;
                      update(idx, { ...a, schema: parsed });
                    } catch {
                      // ignore intermediate invalid json while typing
                    }
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
