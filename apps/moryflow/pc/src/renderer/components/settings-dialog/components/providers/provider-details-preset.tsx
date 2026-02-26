import type { UseFormRegister } from 'react-hook-form';
import { Button } from '@moryflow/ui/components/button';
import { Input } from '@moryflow/ui/components/input';
import { Label } from '@moryflow/ui/components/label';
import { Switch } from '@moryflow/ui/components/switch';
import { Badge } from '@moryflow/ui/components/badge';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import { Plus, CircleCheck, SquareArrowUpRight, Loader, Search, Settings } from 'lucide-react';
import type { FormValues } from '../../const';
import { AddModelDialog, type AddModelFormData } from './add-model-dialog';
import {
  EditModelDialog,
  type EditModelFormData,
  type EditModelInitialData,
} from './edit-model-dialog';
import type { ProviderModelView, ProviderTestStatus } from './provider-details.types';
import { useTranslation } from '@/lib/i18n';

type PresetProviderInfo = {
  name: string;
  description?: string;
  docUrl: string;
  defaultBaseUrl?: string;
};

type ProviderDetailsPresetProps = {
  preset: PresetProviderInfo;
  presetIndex: number;
  register: UseFormRegister<FormValues>;
  testStatus: ProviderTestStatus;
  onTest: () => void;
  searchQuery: string;
  onSearchQueryChange: (nextValue: string) => void;
  allModelsCount: number;
  filteredModels: Array<{ model: ProviderModelView; index: number }>;
  isModelEnabled: (modelId: string, modelIndex: number) => boolean;
  onOpenAddModel: () => void;
  onEditModel: (model: EditModelInitialData) => void;
  onToggleModel: (modelId: string, enabled: boolean) => void;
  onRemoveCustomModel: (modelId: string) => void;
  addModelOpen: boolean;
  onAddModelOpenChange: (open: boolean) => void;
  onAddModel: (data: AddModelFormData) => void;
  existingModelIds: string[];
  editModelOpen: boolean;
  onEditModelOpenChange: (open: boolean) => void;
  onSaveModel: (data: EditModelFormData) => void;
  editModelData: EditModelInitialData | null;
};

export const ProviderDetailsPreset = ({
  preset,
  presetIndex,
  register,
  testStatus,
  onTest,
  searchQuery,
  onSearchQueryChange,
  allModelsCount,
  filteredModels,
  isModelEnabled,
  onOpenAddModel,
  onEditModel,
  onToggleModel,
  onRemoveCustomModel,
  addModelOpen,
  onAddModelOpenChange,
  onAddModel,
  existingModelIds,
  editModelOpen,
  onEditModelOpenChange,
  onSaveModel,
  editModelData,
}: ProviderDetailsPresetProps) => {
  const { t } = useTranslation('settings');

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{preset.name}</h3>
            {preset.description && <p className="mt-1 text-sm text-muted-foreground">{preset.description}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <a
              href={preset.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1 text-sm"
            >
              {t('documentation')} <SquareArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <div className="flex gap-2">
            <Input
              id="api-key"
              type="password"
              placeholder={t('enterApiKey')}
              {...register(`providers.${presetIndex}.apiKey` as const)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onTest}
              disabled={testStatus === 'testing'}
            >
              {testStatus === 'testing' && <Loader className="h-4 w-4 animate-spin mr-1" />}
              {testStatus === 'success' && <CircleCheck className="h-4 w-4 text-green-500 mr-1" />}
              {testStatus === 'idle' || testStatus === 'error' ? t('testButton') : ''}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="base-url">{t('apiAddressOptional')}</Label>
          <Input
            id="base-url"
            placeholder={preset.defaultBaseUrl || 'https://api.example.com/v1'}
            {...register(`providers.${presetIndex}.baseUrl` as const)}
          />
          <p className="text-xs text-muted-foreground">{t('baseUrlHint')}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{t('modelsSection')}</Label>
            <span className="text-xs text-muted-foreground">{t('modelsCount', { count: allModelsCount })}</span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchModels')}
                className="pl-8"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
              />
            </div>
            <Button type="button" variant="outline" size="icon" onClick={onOpenAddModel}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {filteredModels.map(({ model, index: modelIndex }) => {
              const isEnabled = isModelEnabled(model.id, modelIndex);

              return (
                <div key={model.id} className="flex items-center justify-between py-2 px-3 rounded-md border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{model.shortName || model.name}</span>
                      {model.isCustom && (
                        <Badge variant="outline" className="text-xs">
                          {t('customBadge')}
                        </Badge>
                      )}
                      {model.capabilities?.reasoning && (
                        <Badge variant="secondary" className="text-xs">
                          {t('reasoningBadge')}
                        </Badge>
                      )}
                      {model.capabilities?.attachment && (
                        <Badge variant="secondary" className="text-xs">
                          {t('multimodalBadge')}
                        </Badge>
                      )}
                      {model.capabilities?.toolCall && (
                        <Badge variant="secondary" className="text-xs">
                          {t('toolsBadge')}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t('contextLength')}: {Math.round(model.limits.context / 1000)}K
                      {model.isCustom && (
                        <button
                          type="button"
                          className="ml-2 text-destructive hover:underline"
                          onClick={() => onRemoveCustomModel(model.id)}
                        >
                          {t('delete')}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      onClick={() => onEditModel(model)}
                      title={t('configureModel')}
                    >
                      <Settings className="size-4" />
                    </button>
                    <Switch checked={isEnabled} onCheckedChange={(checked) => onToggleModel(model.id, checked)} />
                  </div>
                </div>
              );
            })}
            {filteredModels.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-4">{t('noMatchingModels')}</div>
            )}
          </div>
        </div>

        <AddModelDialog
          open={addModelOpen}
          onOpenChange={onAddModelOpenChange}
          onAdd={onAddModel}
          existingModelIds={existingModelIds}
        />

        <EditModelDialog
          open={editModelOpen}
          onOpenChange={onEditModelOpenChange}
          onSave={onSaveModel}
          initialData={editModelData}
        />
      </div>
    </ScrollArea>
  );
};
