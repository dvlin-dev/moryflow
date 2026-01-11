/**
 * Extract Playground 页面
 * 使用 react-hook-form + zod 验证
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod/v4';
import { toast } from 'sonner';
import {
  AiCloud02Icon,
  Loading01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
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
  Icon,
  Input,
  Textarea,
} from '@aiget/ui';
import { useApiKeys } from '@/features/api-keys';
import {
  useExtract,
  type ExtractRequest,
  type ExtractResponse,
} from '@/features/extract-playground';
import {
  ApiKeySelector,
  CodeExample,
  CollapsibleSection,
  extractFormSchema,
  type ExtractFormValues,
} from '@/features/playground-shared';
import { FETCHX_API } from '@/lib/api-paths';

const EXAMPLE_SCHEMA = `{
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "price": { "type": "number" },
    "description": { "type": "string" }
  },
  "required": ["title"]
}`;

export default function ExtractPlaygroundPage() {
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<ExtractRequest | null>(null);
  const [schemaError, setSchemaError] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(true);

  // 如果用户未手动选择，使用第一个活跃的 API Key
  const effectiveKeyId = selectedKeyId ?? apiKeys.find((k) => k.isActive)?.id ?? '';
  const selectedKey = apiKeys.find((k) => k.id === effectiveKeyId);
  const apiKeyValue = selectedKey?.keyPrefix ? `${selectedKey.keyPrefix}...` : '';

  const { mutate, isPending, data, error, reset } = useExtract(selectedKey?.keyPrefix || '');

  const form = useForm<ExtractFormValues>({
    resolver: zodResolver(extractFormSchema),
    defaultValues: {
      url: '',
      prompt: '',
      schemaText: '',
    },
  });

  const handleFormSubmit = (values: ExtractFormValues) => {
    let schema: Record<string, unknown> | undefined;
    if (values.schemaText.trim()) {
      try {
        schema = JSON.parse(values.schemaText.trim());
        setSchemaError('');
      } catch {
        setSchemaError('Invalid JSON schema');
        return;
      }
    }

    const request: ExtractRequest = { url: values.url };
    if (values.prompt.trim()) request.prompt = values.prompt.trim();
    if (schema) request.schema = schema;

    setLastRequest(request);
    reset();
    mutate(request, {
      onSuccess: (result: ExtractResponse) => {
        if (result.success) {
          toast.success('Data extracted successfully');
        } else {
          toast.error(`Extract failed: ${result.error?.message}`);
        }
      },
      onError: (err: Error) => {
        toast.error(`Request failed: ${err.message}`);
      },
    });
  };

  const loadExampleSchema = () => {
    form.setValue('schemaText', EXAMPLE_SCHEMA);
    setSchemaError('');
  };

  if (isLoadingKeys) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Extract Playground</h1>
        <p className="text-muted-foreground mt-1">
          Use AI to extract structured data from any webpage.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request</CardTitle>
              <CardDescription>Configure extraction options</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                  <ApiKeySelector
                    apiKeys={apiKeys}
                    selectedKeyId={effectiveKeyId}
                    onKeyChange={setSelectedKeyId}
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
                          <Button type="submit" disabled={isPending || !selectedKey?.isActive}>
                            {isPending ? (
                              <Icon icon={Loading01Icon} className="h-4 w-4 animate-spin" />
                            ) : (
                              <Icon icon={AiCloud02Icon} className="h-4 w-4" />
                            )}
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
                    onOpenChange={setOptionsOpen}
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
                            <FormDescription>
                              Natural language instruction for extraction
                            </FormDescription>
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
                                onClick={loadExampleSchema}
                                disabled={isPending}
                              >
                                Load Example
                              </Button>
                            </div>
                            <FormControl>
                              <Textarea
                                placeholder={EXAMPLE_SCHEMA}
                                rows={8}
                                className="font-mono text-xs"
                                disabled={isPending}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  setSchemaError('');
                                }}
                              />
                            </FormControl>
                            {schemaError && (
                              <p className="text-xs text-destructive">{schemaError}</p>
                            )}
                            <FormDescription>
                              Define the structure of extracted data
                            </FormDescription>
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
                  apiKey={apiKeyValue}
                  body={lastRequest}
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          {error && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{error.message}</p>
              </CardContent>
            </Card>
          )}

          {data && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {data.success ? (
                    <>
                      <Icon icon={CheckmarkCircle01Icon} className="h-5 w-5 text-green-600" />
                      Extraction Successful
                    </>
                  ) : (
                    <>
                      <Icon icon={Cancel01Icon} className="h-5 w-5 text-destructive" />
                      Extraction Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.success && data.data ? (
                  <pre className="overflow-auto max-h-[500px] p-4 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(data.data, null, 2)}
                  </pre>
                ) : data.error ? (
                  <div className="rounded-lg bg-destructive/10 p-4">
                    <p className="font-mono text-sm">
                      {data.error.code}: {data.error.message}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {!data && !error && (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground">
                  Enter a URL and click "Extract" to see results.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
