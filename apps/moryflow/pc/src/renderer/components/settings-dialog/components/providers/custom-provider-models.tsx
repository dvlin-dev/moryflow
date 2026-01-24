/**
 * [PROPS]: { models, onAddModel, onToggleModel, onDeleteModel }
 * [EMITS]: onAddModel({ id, name }), onToggleModel(modelId, enabled), onDeleteModel(modelId)
 * [POS]: Custom Provider 的模型列表 UI（不直接读写表单，仅负责展示和交互）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useMemo, useState } from 'react';
import { Button } from '@anyhunt/ui/components/button';
import { Label } from '@anyhunt/ui/components/label';
import { Switch } from '@anyhunt/ui/components/switch';
import { Add01Icon, Delete01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@anyhunt/ui/components/icon';
import { AddCustomProviderModelDialog } from './add-custom-provider-model-dialog';

export type CustomProviderModel = {
  id: string;
  name: string;
  enabled: boolean;
};

type CustomProviderModelsProps = {
  models: CustomProviderModel[];
  onAddModel: (data: { id: string; name: string }) => void;
  onToggleModel: (modelId: string, enabled: boolean) => void;
  onDeleteModel: (modelId: string) => void;
};

export const CustomProviderModels = ({
  models,
  onAddModel,
  onToggleModel,
  onDeleteModel,
}: CustomProviderModelsProps) => {
  const [addOpen, setAddOpen] = useState(false);

  const existingModelIds = useMemo(() => models.map((m) => m.id), [models]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Models</Label>
        <Button type="button" variant="outline" size="icon" onClick={() => setAddOpen(true)}>
          <Icon icon={Add01Icon} className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {models.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No models yet. Add one to enable testing and model selection.
          </div>
        ) : (
          models.map((model) => (
            <div
              key={model.id}
              className="flex items-center justify-between py-2 px-3 rounded-md border"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{model.name}</span>
                </div>
                <div className="text-xs text-muted-foreground font-mono truncate">{model.id}</div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const ok = window.confirm(`Delete model "${model.name}"?`);
                    if (ok) onDeleteModel(model.id);
                  }}
                  aria-label="Delete model"
                >
                  <Icon icon={Delete01Icon} className="h-4 w-4" />
                </Button>
                <Switch
                  checked={model.enabled}
                  onCheckedChange={(checked) => onToggleModel(model.id, checked)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <AddCustomProviderModelDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existingModelIds={existingModelIds}
        onAdd={onAddModel}
      />
    </div>
  );
};
