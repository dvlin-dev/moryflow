/**
 * [PROPS]: activeKeys, effectiveKeyId, apiKeyDisplay, hasActiveKey, isLoading, form, onKeyChange, onSubmit
 * [EMITS]: onKeyChange(keyId), onSubmit(values)
 * [POS]: Memox Graph 查询区域（API Key + 查询表单）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import type { UseFormReturn } from 'react-hook-form';
import { Info, Loader } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui';
import type { ApiKey } from '@/features/api-keys';
import { ApiKeySelector } from '@/features/playground-shared';
import type { GraphFormInput, GraphFormValues } from '../graph-schemas';

interface MemoxGraphQueryCardProps {
  activeKeys: ApiKey[];
  effectiveKeyId: string;
  apiKeyDisplay: string;
  hasActiveKey: boolean;
  isLoading: boolean;
  form: UseFormReturn<GraphFormInput, unknown, GraphFormValues>;
  onKeyChange: (keyId: string) => void;
  onSubmit: (values: GraphFormValues) => void;
}

export function MemoxGraphQueryCard({
  activeKeys,
  effectiveKeyId,
  apiKeyDisplay,
  hasActiveKey,
  isLoading,
  form,
  onKeyChange,
  onSubmit,
}: MemoxGraphQueryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Query</CardTitle>
        <CardDescription>Select API key and entity to load graph</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ApiKeySelector
          apiKeys={activeKeys}
          selectedKeyId={effectiveKeyId}
          onKeyChange={onKeyChange}
          disabled={isLoading}
        />

        <div className="space-y-2">
          <Label>Selected Key</Label>
          <Input placeholder="Select an API key" value={apiKeyDisplay} readOnly />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="entityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity Type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="app">App</SelectItem>
                          <SelectItem value="run">Run</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="entityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity ID</FormLabel>
                    <FormControl>
                      <Input placeholder="entity-123" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limit</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="1000" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={!hasActiveKey || isLoading}>
              {isLoading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                <>Load Graph</>
              )}
            </Button>
          </form>
        </Form>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Graph data is derived from entities and relations stored on memories.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
