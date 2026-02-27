import type { UseFormRegister } from 'react-hook-form';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import { Label } from '@moryflow/ui/components/label';
import { Input } from '@moryflow/ui/components/input';
import { Button } from '@moryflow/ui/components/button';
import { CircleCheck, Delete, Loader } from 'lucide-react';
import type { FormValues } from '../../const';
import type { AddModelFormData } from './add-model-dialog';
import type { EditModelFormData } from './edit-model-dialog';
import { CustomProviderModels } from './custom-provider-models';
import type { ProviderTestStatus } from './provider-details.types';
import { useTranslation } from '@/lib/i18n';

type CustomProviderConfig = FormValues['customProviders'][number];

type ProviderDetailsCustomProps = {
  customIndex: number;
  config: CustomProviderConfig;
  register: UseFormRegister<FormValues>;
  testStatus: ProviderTestStatus;
  onTest: () => void;
  onAddModel: (data: AddModelFormData) => void;
  onUpdateModel: (data: EditModelFormData) => void;
  onToggleModel: (modelId: string, enabled: boolean) => void;
  onDeleteModel: (modelId: string) => void;
  onRemoveProvider: () => void;
};

export const ProviderDetailsCustom = ({
  customIndex,
  config,
  register,
  testStatus,
  onTest,
  onAddModel,
  onUpdateModel,
  onToggleModel,
  onDeleteModel,
  onRemoveProvider,
}: ProviderDetailsCustomProps) => {
  const { t } = useTranslation('settings');

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        <div className="space-y-2">
          <Label htmlFor="custom-name">{t('customProviderNameLabel')}</Label>
          <Input
            id="custom-name"
            placeholder={t('customProviderPlaceholder')}
            {...register(`customProviders.${customIndex}.name`)}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('sdkType')}</Label>
          <Input value={t('sdkTypeOpenAICompatible')} disabled readOnly />
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom-api-key">API Key</Label>
          <div className="flex gap-2">
            <Input
              id="custom-api-key"
              type="password"
              placeholder={t('enterApiKey')}
              {...register(`customProviders.${customIndex}.apiKey`)}
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
          <Label htmlFor="custom-base-url">{t('apiAddress')}</Label>
          <Input
            id="custom-base-url"
            placeholder="https://api.example.com/v1"
            {...register(`customProviders.${customIndex}.baseUrl`)}
          />
        </div>

        <CustomProviderModels
          models={config.models || []}
          providerId={config.providerId}
          sdkType="openai-compatible"
          onAddModel={onAddModel}
          onUpdateModel={onUpdateModel}
          onToggleModel={onToggleModel}
          onDeleteModel={onDeleteModel}
        />

        <div className="pt-4 border-t">
          <Button type="button" variant="destructive" size="sm" onClick={onRemoveProvider}>
            <Delete className="h-4 w-4 mr-1" />
            {t('deleteProvider')}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
};
