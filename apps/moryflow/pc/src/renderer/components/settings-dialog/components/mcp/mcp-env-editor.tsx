import { useFieldArray, type Control } from 'react-hook-form';
import { Button } from '@anyhunt/ui/components/button';
import { Input } from '@anyhunt/ui/components/input';
import { Label } from '@anyhunt/ui/components/label';
import { Plus, Delete, View, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { FormValues } from '../../const';

type McpEnvEditorProps = {
  control: Control<FormValues>;
  name: `mcp.stdio.${number}.env` | `mcp.streamableHttp.${number}.headers`;
  label: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
};

export const McpEnvEditor = ({
  control,
  name,
  label,
  keyPlaceholder = 'KEY',
  valuePlaceholder = 'value',
}: McpEnvEditorProps) => {
  const { fields, append, remove } = useFieldArray({ control, name });
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());

  const toggleVisibility = (index: number) => {
    setVisibleIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append({ key: '', value: '' })}
        >
          <Plus className="mr-1 size-3" />
          Add
        </Button>
      </div>
      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">No entries yet. Add one to get started.</p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => {
            const isVisible = visibleIndices.has(index);
            // 动态构建字段路径
            const keyPath = `${name}.${index}.key` as const;
            const valuePath = `${name}.${index}.value` as const;

            return (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  placeholder={keyPlaceholder}
                  className="flex-1 font-mono text-sm"
                  {...control.register(keyPath)}
                />
                <span className="text-muted-foreground">=</span>
                <div className="relative flex-1">
                  <Input
                    type={isVisible ? 'text' : 'password'}
                    placeholder={valuePlaceholder}
                    className="pr-10 font-mono text-sm"
                    {...control.register(valuePath)}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                    onClick={() => toggleVisibility(index)}
                  >
                    {isVisible ? (
                      <EyeOff className="size-4 text-muted-foreground" />
                    ) : (
                      <View className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => remove(index)}>
                  <Delete className="size-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
