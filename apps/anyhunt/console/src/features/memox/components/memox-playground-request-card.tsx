/**
 * [PROPS]: MemoxPlaygroundRequestCardProps
 * [EMITS]: onActiveTabChange, onKeyChange, onCreateSubmit, onSearchSubmit
 * [POS]: Memox Playground 请求区（API Key + Tabs + Create/Search 表单 + CodeExample）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import type { UseFormReturn } from 'react-hook-form';
import { Plus, Search } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@moryflow/ui';
import type { ApiKey } from '@/features/api-keys';
import { ApiKeySelector, CodeExample } from '@/features/playground-shared';
import { MEMOX_API } from '@/lib/api-paths';
import type {
  CreateMemoryFormInput,
  CreateMemoryFormValues,
  MemoxPlaygroundTab,
  SearchMemoryFormInput,
  SearchMemoryFormValues,
} from '../playground-schemas';
import { MemoxPlaygroundCreateForm } from './memox-playground-create-form';
import { MemoxPlaygroundSearchForm } from './memox-playground-search-form';

interface MemoxPlaygroundRequestCardProps {
  apiKeys: ApiKey[];
  effectiveKeyId: string;
  apiKeyDisplay: string;
  apiKeyValue: string;
  activeTab: MemoxPlaygroundTab;
  createForm: UseFormReturn<CreateMemoryFormInput, unknown, CreateMemoryFormValues>;
  searchForm: UseFormReturn<SearchMemoryFormInput, unknown, SearchMemoryFormValues>;
  isCreateSubmitting: boolean;
  isSearchSubmitting: boolean;
  createCodeExampleBody: Record<string, unknown> | null;
  searchCodeExampleBody: Record<string, unknown> | null;
  onKeyChange: (keyId: string) => void;
  onActiveTabChange: (tab: MemoxPlaygroundTab) => void;
  onCreateSubmit: (values: CreateMemoryFormValues) => void;
  onSearchSubmit: (values: SearchMemoryFormValues) => void;
}

export function MemoxPlaygroundRequestCard({
  apiKeys,
  effectiveKeyId,
  apiKeyDisplay,
  apiKeyValue,
  activeTab,
  createForm,
  searchForm,
  isCreateSubmitting,
  isSearchSubmitting,
  createCodeExampleBody,
  searchCodeExampleBody,
  onKeyChange,
  onActiveTabChange,
  onCreateSubmit,
  onSearchSubmit,
}: MemoxPlaygroundRequestCardProps) {
  const isSubmitting = isCreateSubmitting || isSearchSubmitting;
  const hasApiKey = Boolean(apiKeyValue);

  const renderCodeExample = () => {
    if (activeTab === 'create' && createCodeExampleBody) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Code Example</CardTitle>
            <CardDescription>Copy and use this code in your application</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeExample
              endpoint={MEMOX_API.MEMORIES}
              method="POST"
              apiKey={apiKeyDisplay}
              apiKeyValue={apiKeyValue}
              body={createCodeExampleBody}
            />
          </CardContent>
        </Card>
      );
    }

    if (activeTab === 'search' && searchCodeExampleBody) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Code Example</CardTitle>
            <CardDescription>Copy and use this code in your application</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeExample
              endpoint={MEMOX_API.MEMORIES_SEARCH}
              method="POST"
              apiKey={apiKeyDisplay}
              apiKeyValue={apiKeyValue}
              body={searchCodeExampleBody}
            />
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Request</CardTitle>
          <CardDescription>Create or search memories using the Memox API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApiKeySelector
            apiKeys={apiKeys}
            selectedKeyId={effectiveKeyId}
            onKeyChange={onKeyChange}
            disabled={isSubmitting}
          />

          <div className="space-y-2">
            <Label>API Key</Label>
            <Input placeholder="Select an API key" value={apiKeyDisplay} readOnly />
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(nextTab) => onActiveTabChange(nextTab as MemoxPlaygroundTab)}
          >
            <TabsList className="w-full">
              <TabsTrigger value="create" className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Create
              </TabsTrigger>
              <TabsTrigger value="search" className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Search
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="mt-4">
              <MemoxPlaygroundCreateForm
                form={createForm}
                isSubmitting={isCreateSubmitting}
                hasApiKey={hasApiKey}
                onSubmit={onCreateSubmit}
              />
            </TabsContent>

            <TabsContent value="search" className="mt-4">
              <MemoxPlaygroundSearchForm
                form={searchForm}
                isSubmitting={isSearchSubmitting}
                hasApiKey={hasApiKey}
                onSubmit={onSearchSubmit}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {renderCodeExample()}
    </div>
  );
}
