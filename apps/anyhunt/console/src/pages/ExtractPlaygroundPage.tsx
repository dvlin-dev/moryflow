/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Extract Playground 页面（容器编排层）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent } from '@moryflow/ui';
import { useApiKeys, resolveActiveApiKeySelection } from '@/features/api-keys';
import { useExtract, type ExtractRequest } from '@/features/extract-playground';
import { ExtractRequestCard } from '@/features/extract-playground/components/extract-request-card';
import { ExtractResultPanel } from '@/features/extract-playground/components/extract-result-panel';
import {
  extractFormSchema,
  extractFormDefaults,
  PlaygroundPageShell,
  type ExtractFormValues,
} from '@/features/playground-shared';

const EXAMPLE_SCHEMA = `{
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "price": { "type": "number" },
    "description": { "type": "string" }
  },
  "required": ["title"]
}`;

function parseOptionalSchema(schemaText: string): { schema?: Record<string, unknown>; error?: string } {
  if (!schemaText.trim()) {
    return {};
  }

  try {
    return { schema: JSON.parse(schemaText.trim()) as Record<string, unknown> };
  } catch {
    return { error: 'Invalid JSON schema' };
  }
}

function buildExtractRequest(
  values: ExtractFormValues,
  schema?: Record<string, unknown>
): ExtractRequest {
  const request: ExtractRequest = {
    url: values.url,
  };

  if (values.prompt.trim()) {
    request.prompt = values.prompt.trim();
  }

  if (schema) {
    request.schema = schema;
  }

  return request;
}

export default function ExtractPlaygroundPage() {
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [lastRequest, setLastRequest] = useState<ExtractRequest | null>(null);
  const [schemaError, setSchemaError] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(true);

  const { effectiveKeyId, apiKeyValue, apiKeyDisplay, hasActiveKey } = resolveActiveApiKeySelection(
    apiKeys,
    selectedKeyId
  );

  const { mutate, isPending, data, error, reset } = useExtract(apiKeyValue);

  const form = useForm<ExtractFormValues>({
    resolver: zodResolver(extractFormSchema),
    defaultValues: extractFormDefaults,
  });

  const handleFormSubmit = form.handleSubmit((values) => {
    const parsedSchema = parseOptionalSchema(values.schemaText);

    if (parsedSchema.error) {
      setSchemaError(parsedSchema.error);
      return;
    }

    setSchemaError('');

    const request = buildExtractRequest(values, parsedSchema.schema);

    setLastRequest(request);
    reset();
    mutate(request, {
      onSuccess: () => {
        toast.success('Data extracted successfully');
      },
      onError: (requestError: Error) => {
        toast.error(`Extract failed: ${requestError.message}`);
      },
    });
  });

  const handleLoadExampleSchema = () => {
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

  const requestContent = (
    <ExtractRequestCard
      apiKeys={apiKeys}
      effectiveKeyId={effectiveKeyId}
      selectedKeyActive={hasActiveKey}
      apiKeyDisplay={apiKeyDisplay}
      apiKeyValue={apiKeyValue}
      isPending={isPending}
      optionsOpen={optionsOpen}
      schemaError={schemaError}
      lastRequest={lastRequest}
      form={form}
      schemaExample={EXAMPLE_SCHEMA}
      onSubmit={handleFormSubmit}
      onOptionsOpenChange={setOptionsOpen}
      onKeyChange={setSelectedKeyId}
      onLoadExampleSchema={handleLoadExampleSchema}
      onSchemaErrorClear={() => setSchemaError('')}
    />
  );

  const resultContent = <ExtractResultPanel data={data} error={error} />;

  return (
    <PlaygroundPageShell
      title="Extract Playground"
      description="Use AI to extract structured data from any webpage."
      request={requestContent}
      result={resultContent}
    />
  );
}
