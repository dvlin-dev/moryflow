/**
 * [PROPS]: SystemPromptSectionProps - System Prompt 设置表单
 * [EMITS]: none
 * [POS]: Settings Dialog 的 System Prompt 标签页（renderer 安全导入 prompt）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@moryflow/ui/components/accordion';
import { RadioGroup, RadioGroupItem } from '@moryflow/ui/components/radio-group';
import { Textarea } from '@moryflow/ui/components/textarea';
import { Input } from '@moryflow/ui/components/input';
import { Label } from '@moryflow/ui/components/label';
import { Button } from '@moryflow/ui/components/button';
import { Switch } from '@moryflow/ui/components/switch';
import { getMorySystemPrompt } from '@moryflow/agents-runtime/prompt';
import { useTranslation } from '@/lib/i18n';
import type { FormValues } from '../const';

type SystemPromptSectionProps = {
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;
};

const DEFAULT_SYSTEM_PROMPT = getMorySystemPrompt();

const handleNumberChange = (
  rawValue: string,
  currentValue: number,
  onChange: (next: number) => void
) => {
  if (rawValue === '') {
    onChange(currentValue);
    return;
  }
  const next = Number(rawValue);
  if (Number.isFinite(next)) {
    onChange(next);
  }
};

export const SystemPromptSection = ({ control, setValue }: SystemPromptSectionProps) => {
  const { t } = useTranslation('settings');
  const mode = useWatch({ control, name: 'systemPrompt.mode' }) ?? 'default';
  const isCustom = mode === 'custom';
  const temperatureMode = useWatch({ control, name: 'modelParams.temperature.mode' }) ?? 'default';
  const topPMode = useWatch({ control, name: 'modelParams.topP.mode' }) ?? 'default';
  const maxTokensMode = useWatch({ control, name: 'modelParams.maxTokens.mode' }) ?? 'default';

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-xl bg-background p-4">
        <div>
          <h3 className="text-sm font-medium">{t('systemPromptModeLabel')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t('systemPromptModeHint')}</p>
        </div>
        <Controller
          control={control}
          name="systemPrompt.mode"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={(value) => field.onChange(value)}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="system-prompt-default" value="default" />
                <Label htmlFor="system-prompt-default">{t('systemPromptModeDefault')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="system-prompt-custom" value="custom" />
                <Label htmlFor="system-prompt-custom">{t('systemPromptModeCustom')}</Label>
              </div>
            </RadioGroup>
          )}
        />
      </div>

      {!isCustom ? (
        <div className="rounded-xl bg-muted/30 p-4 text-xs text-muted-foreground">
          {t('systemPromptDefaultHint')}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="system-prompt-template">{t('systemPromptTemplateLabel')}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setValue('systemPrompt.template', DEFAULT_SYSTEM_PROMPT, { shouldDirty: true })
                }
              >
                {t('systemPromptResetTemplate')}
              </Button>
            </div>
            <Controller
              control={control}
              name="systemPrompt.template"
              render={({ field }) => (
                <Textarea
                  id="system-prompt-template"
                  rows={10}
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  placeholder={t('systemPromptTemplatePlaceholder')}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">{t('systemPromptTemplateHint')}</p>
          </div>

          <Accordion type="single" collapsible className="rounded-xl border border-border-muted">
            <AccordionItem value="advanced" className="border-b-0 px-4">
              <AccordionTrigger className="text-left">
                <div>
                  <p className="text-sm font-medium">{t('systemPromptAdvancedLabel')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('systemPromptAdvancedHint')}
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium">{t('systemPromptParamsLabel')}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('systemPromptParamsHint')}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border-muted bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="system-prompt-temperature">
                          {t('systemPromptTemperatureLabel')}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor="system-prompt-temperature-default"
                            className="text-xs text-muted-foreground"
                          >
                            {t('systemPromptUseDefaultLabel')}
                          </Label>
                          <Controller
                            control={control}
                            name="modelParams.temperature.mode"
                            render={({ field }) => (
                              <Switch
                                id="system-prompt-temperature-default"
                                checked={field.value === 'default'}
                                onCheckedChange={(checked) =>
                                  field.onChange(checked ? 'default' : 'custom')
                                }
                              />
                            )}
                          />
                        </div>
                      </div>
                      {temperatureMode === 'custom' ? (
                        <Controller
                          control={control}
                          name="modelParams.temperature.value"
                          render={({ field }) => (
                            <Input
                              id="system-prompt-temperature"
                              type="number"
                              min={0}
                              max={2}
                              step="0.1"
                              value={field.value}
                              onChange={(event) =>
                                handleNumberChange(event.target.value, field.value, field.onChange)
                              }
                              placeholder="0.0 - 2.0"
                              className="mt-2"
                            />
                          )}
                        />
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t('systemPromptUseDefaultHint')}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-border-muted bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="system-prompt-top-p">{t('systemPromptTopPLabel')}</Label>
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor="system-prompt-top-p-default"
                            className="text-xs text-muted-foreground"
                          >
                            {t('systemPromptUseDefaultLabel')}
                          </Label>
                          <Controller
                            control={control}
                            name="modelParams.topP.mode"
                            render={({ field }) => (
                              <Switch
                                id="system-prompt-top-p-default"
                                checked={field.value === 'default'}
                                onCheckedChange={(checked) =>
                                  field.onChange(checked ? 'default' : 'custom')
                                }
                              />
                            )}
                          />
                        </div>
                      </div>
                      {topPMode === 'custom' ? (
                        <Controller
                          control={control}
                          name="modelParams.topP.value"
                          render={({ field }) => (
                            <Input
                              id="system-prompt-top-p"
                              type="number"
                              min={0}
                              max={1}
                              step="0.05"
                              value={field.value}
                              onChange={(event) =>
                                handleNumberChange(event.target.value, field.value, field.onChange)
                              }
                              placeholder="0.0 - 1.0"
                              className="mt-2"
                            />
                          )}
                        />
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t('systemPromptUseDefaultHint')}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-border-muted bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="system-prompt-max-tokens">
                          {t('systemPromptMaxTokensLabel')}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor="system-prompt-max-tokens-default"
                            className="text-xs text-muted-foreground"
                          >
                            {t('systemPromptUseDefaultLabel')}
                          </Label>
                          <Controller
                            control={control}
                            name="modelParams.maxTokens.mode"
                            render={({ field }) => (
                              <Switch
                                id="system-prompt-max-tokens-default"
                                checked={field.value === 'default'}
                                onCheckedChange={(checked) =>
                                  field.onChange(checked ? 'default' : 'custom')
                                }
                              />
                            )}
                          />
                        </div>
                      </div>
                      {maxTokensMode === 'custom' ? (
                        <Controller
                          control={control}
                          name="modelParams.maxTokens.value"
                          render={({ field }) => (
                            <Input
                              id="system-prompt-max-tokens"
                              type="number"
                              min={1}
                              step="1"
                              value={field.value}
                              onChange={(event) =>
                                handleNumberChange(event.target.value, field.value, field.onChange)
                              }
                              placeholder="Auto"
                              className="mt-2"
                            />
                          )}
                        />
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t('systemPromptUseDefaultHint')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
};
