/**
 * [PROPS]: ExtractRequestCardProps
 * [EMITS]: onSubmit, onKeyChange, onLoadExampleSchema
 * [POS]: Extract Playground 请求区（表单 + Code Example）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { FormEventHandler } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Sparkles, Loader } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from '@moryflow/ui';
import type { ApiKey } from '@/features/api-keys';
import {
  ApiKeySelector,
  CodeExample,
  CollapsibleSection,
  type ExtractFormValues,
  type ExtractRequest,
} from '@/features/playground-shared';
import { FETCHX_API } from '@/lib/api-paths';

interface ExtractRequestCardProps {
  apiKeys: ApiKey[];
  effectiveKeyId: string;
  selectedKeyActive: boolean;
  apiKeyDisplay: string;
  apiKeyValue: string;
  isPending: boolean;
  optionsOpen: boolean;
  schemaError: string;
  lastRequest: ExtractRequest | null;
  form: UseFormReturn<ExtractFormValues>;
  schemaExample: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onOptionsOpenChange: (open: boolean) => void;
  onKeyChange: (keyId: string) => void;
  onLoadExampleSchema: () => void;
  onSchemaErrorClear: () => void;
}

function ExtractSubmitIcon({ isPending }: { isPending: boolean }) {
  if (isPending) {
    return <Loader className="h-4 w-4 animate-spin" />;
  }
  return <Sparkles className="h-4 w-4" />;
}

export function ExtractRequestCard({
  apiKeys,
  effectiveKeyId,
  selectedKeyActive,
  apiKeyDisplay,
  apiKeyValue,
  isPending,
  optionsOpen,
  schemaError,
  lastRequest,
  form,
  schemaExample,
  onSubmit,
  onOptionsOpenChange,
  onKeyChange,
  onLoadExampleSchema,
  onSchemaErrorClear,
}: ExtractRequestCardProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Request</CardTitle>
          <CardDescription>Configure extraction options</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <ApiKeySelector
                apiKeys={apiKeys}
                selectedKeyId={effectiveKeyId}
                onKeyChange={onKeyChange}
                disabled={isPending}
              />

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target URL</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com/product"
                          className="flex-1"
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <Button type="submit" disabled={isPending || !selectedKeyActive}>
                        <ExtractSubmitIcon isPending={isPending} />
                        <span className="ml-2">Extract</span>
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <CollapsibleSection
                title="Extraction Options"
                open={optionsOpen}
                onOpenChange={onOptionsOpenChange}
              >
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="prompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prompt (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Extract the product name, price, and description"
                            rows={2}
                            disabled={isPending}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Natural language instruction for extraction</FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="schemaText"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>JSON Schema (optional)</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onLoadExampleSchema}
                            disabled={isPending}
                          >
                            Load Example
                          </Button>
                        </div>
                        <FormControl>
                          <Textarea
                            placeholder={schemaExample}
                            rows={8}
                            className="font-mono text-xs"
                            disabled={isPending}
                            {...field}
                            onChange={(event) => {
                              field.onChange(event);
                              onSchemaErrorClear();
                            }}
                          />
                        </FormControl>
                        {schemaError && <p className="text-xs text-destructive">{schemaError}</p>}
                        <FormDescription>Define the structure of extracted data</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleSection>
            </form>
          </Form>
        </CardContent>
      </Card>

      {lastRequest && (
        <Card>
          <CardHeader>
            <CardTitle>Code Example</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeExample
              endpoint={FETCHX_API.EXTRACT}
              method="POST"
              apiKey={apiKeyDisplay}
              apiKeyValue={apiKeyValue}
              body={lastRequest}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
