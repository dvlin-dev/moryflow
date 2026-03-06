/**
 * [PROPS]: form/providers/model/canSelectProvider
 * [EMITS]: none
 * [POS]: LLM Model 基础信息字段
 */

import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui';
import {
  llmTierOptions,
  type LlmModelFormValues,
  type LlmModelListItem,
  type LlmProviderListItem,
} from '@/features/llm';

export interface ModelIdentityFieldsProps {
  form: UseFormReturn<LlmModelFormValues>;
  providers: LlmProviderListItem[];
  model: LlmModelListItem | null;
  canSelectProvider: boolean;
  isCreate: boolean;
  isSubmitting: boolean;
}

export function ModelIdentityFields({
  form,
  providers,
  model,
  canSelectProvider,
  isCreate,
  isSubmitting,
}: ModelIdentityFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="providerId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Provider</FormLabel>
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={!canSelectProvider || isSubmitting}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name} ({provider.providerType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
            {!canSelectProvider ? (
              <p className="text-xs text-muted-foreground">
                Provider cannot be changed after creation.
              </p>
            ) : null}
            {canSelectProvider && !isCreate && !model?.providerId ? (
              <p className="text-xs text-destructive">
                Provider is missing. Please select one to recover this mapping.
              </p>
            ) : null}
          </FormItem>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="modelId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>modelId (public)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="gpt-4o" autoComplete="off" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="upstreamId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>upstreamId (provider)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="openai/gpt-4o" autoComplete="off" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="displayName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Display name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="GPT-4o" autoComplete="off" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="inputTokenPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Input price (USD / 1M)</FormLabel>
              <FormControl>
                <Input {...field} inputMode="decimal" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="outputTokenPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Output price (USD / 1M)</FormLabel>
              <FormControl>
                <Input {...field} inputMode="decimal" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="minTier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum tier</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {llmTierOptions.map((tier) => (
                    <SelectItem key={tier.value} value={tier.value}>
                      {tier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sortOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sort order</FormLabel>
              <FormControl>
                <Input {...field} inputMode="numeric" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="maxContextTokens"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max context tokens</FormLabel>
              <FormControl>
                <Input {...field} inputMode="numeric" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maxOutputTokens"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max output tokens</FormLabel>
              <FormControl>
                <Input {...field} inputMode="numeric" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
