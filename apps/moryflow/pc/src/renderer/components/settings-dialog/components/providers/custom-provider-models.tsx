/**
 * [PROPS]: { models, onAddModel, onUpdateModel, onToggleModel, onDeleteModel }
 * [EMITS]: onAddModel(formData), onUpdateModel(formData), onToggleModel(modelId, enabled), onDeleteModel(modelId)
 * [POS]: Custom Provider 的模型列表 UI（复用 AddModelDialog/EditModelDialog，保证与预设服务商一致）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useMemo, useState } from 'react';
import { Input } from '@moryflow/ui/components/input';
import { Button } from '@moryflow/ui/components/button';
import { Label } from '@moryflow/ui/components/label';
import { Switch } from '@moryflow/ui/components/switch';
import { Badge } from '@moryflow/ui/components/badge';
import { Plus, Delete, Search, Settings } from 'lucide-react';
import { AddModelDialog, type AddModelFormData } from './add-model-dialog';
import {
  EditModelDialog,
  type EditModelFormData,
  type EditModelInitialData,
} from './edit-model-dialog';
import { DEFAULT_CUSTOM_MODEL_CONTEXT, DEFAULT_CUSTOM_MODEL_OUTPUT } from './constants';
import type { UserModelConfig } from '@shared/ipc';

export type CustomProviderModel = UserModelConfig;

type CustomProviderModelsProps = {
  models: CustomProviderModel[];
  onAddModel: (data: AddModelFormData) => void;
  onUpdateModel: (data: EditModelFormData) => void;
  onToggleModel: (modelId: string, enabled: boolean) => void;
  onDeleteModel: (modelId: string) => void;
};

export const CustomProviderModels = ({
  models,
  onAddModel,
  onUpdateModel,
  onToggleModel,
  onDeleteModel,
}: CustomProviderModelsProps) => {
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editInitialData, setEditInitialData] = useState<EditModelInitialData | null>(null);

  const existingModelIds = useMemo(() => models.map((m) => m.id), [models]);

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models;
    const query = searchQuery.trim().toLowerCase();
    return models.filter((m) => {
      const name = (m.customName || '').toLowerCase();
      return m.id.toLowerCase().includes(query) || name.includes(query);
    });
  }, [models, searchQuery]);

  const resolveModelName = (model: CustomProviderModel): string => {
    return model.customName || model.id;
  };

  const resolveModelLimits = (model: CustomProviderModel) => {
    return {
      context: model.customContext || DEFAULT_CUSTOM_MODEL_CONTEXT,
      output: model.customOutput || DEFAULT_CUSTOM_MODEL_OUTPUT,
    };
  };

  const resolveModelCapabilities = (
    model: CustomProviderModel
  ): EditModelInitialData['capabilities'] | undefined => {
    if (!model.customCapabilities) return undefined;
    return {
      reasoning: model.customCapabilities.reasoning ?? false,
      attachment: model.customCapabilities.attachment ?? false,
      toolCall: model.customCapabilities.toolCall ?? false,
      temperature: model.customCapabilities.temperature ?? true,
    };
  };

  const handleEdit = (model: CustomProviderModel) => {
    setEditInitialData({
      id: model.id,
      name: resolveModelName(model),
      isPreset: false,
      isCustom: true,
      capabilities: resolveModelCapabilities(model),
      limits: resolveModelLimits(model),
      inputModalities: model.customInputModalities || ['text'],
    });
    setEditOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Models</Label>
        <Button type="button" variant="outline" size="icon" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {models.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No models yet. Add one to enable testing and model selection.
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {filteredModels.map((model) => (
              <div
                key={model.id}
                className="flex items-center justify-between py-2 px-3 rounded-md border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{resolveModelName(model)}</span>
                    {model.customCapabilities?.reasoning && (
                      <Badge variant="secondary" className="text-xs">
                        Reasoning
                      </Badge>
                    )}
                    {model.customCapabilities?.attachment && (
                      <Badge variant="secondary" className="text-xs">
                        Multimodal
                      </Badge>
                    )}
                    {model.customCapabilities?.toolCall && (
                      <Badge variant="secondary" className="text-xs">
                        Tools
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span className="font-mono truncate">{model.id}</span>
                    <span>Context: {Math.round(resolveModelLimits(model).context / 1000)}K</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    onClick={() => handleEdit(model)}
                    title="Configure model"
                  >
                    <Settings className="size-4" />
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const ok = window.confirm(`Delete model "${resolveModelName(model)}"?`);
                      if (ok) onDeleteModel(model.id);
                    }}
                    aria-label="Delete model"
                  >
                    <Delete className="h-4 w-4" />
                  </Button>
                  <Switch
                    checked={model.enabled}
                    onCheckedChange={(checked) => onToggleModel(model.id, checked)}
                  />
                </div>
              </div>
            ))}

            {filteredModels.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-4">
                No matching models found
              </div>
            )}
          </>
        )}
      </div>

      <AddModelDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existingModelIds={existingModelIds}
        onAdd={onAddModel}
      />

      <EditModelDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={onUpdateModel}
        initialData={editInitialData}
      />
    </div>
  );
};
