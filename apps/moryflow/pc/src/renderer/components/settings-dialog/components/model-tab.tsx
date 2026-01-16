import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { Alert, AlertDescription } from '@anyhunt/ui/components/alert'
import { Input } from '@anyhunt/ui/components/input'
import { Label } from '@anyhunt/ui/components/label'
import { useTranslation } from '@/lib/i18n'
import type { FormValues } from '../const'

type ModelTabProps = {
  register: UseFormRegister<FormValues>
  errors: FieldErrors<FormValues>
}

export const ModelTab = ({ register, errors }: ModelTabProps) => {
  const { t } = useTranslation('settings')

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="model-default">{t('defaultModelLabel')}</Label>
        <Input
          id="model-default"
          placeholder="e.g.: openai/gpt-4.1-mini"
          {...register('model.defaultModel')}
        />
        <p className="text-xs text-muted-foreground">
          {t('defaultModelFormatHint')}
        </p>
      </div>
      <Alert variant="default">
        <AlertDescription className="text-xs">
          {t('defaultModelConfigDescription')}
        </AlertDescription>
      </Alert>
    </div>
  )
}
