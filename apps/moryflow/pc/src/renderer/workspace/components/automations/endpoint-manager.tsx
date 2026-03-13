import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Badge } from '@moryflow/ui/components/badge';
import { Button } from '@moryflow/ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@moryflow/ui/components/form';
import { Input } from '@moryflow/ui/components/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@moryflow/ui/components/table';
import type { AutomationEndpoint } from '@shared/ipc';
import {
  createEndpointFormDefaults,
  endpointFormSchema,
  type EndpointFormValues,
} from './forms/endpoint-form-schema';

type EndpointManagerProps = {
  endpoints: AutomationEndpoint[];
  defaultEndpointId: string | null;
  isSaving: boolean;
  onBind: (values: EndpointFormValues) => Promise<void>;
  onRelabel: (endpointId: string, label: string) => Promise<void>;
  onDelete: (endpointId: string) => Promise<void>;
  onSetDefault: (endpointId?: string) => Promise<void>;
};

export const EndpointManager = ({
  endpoints,
  defaultEndpointId,
  isSaving,
  onBind,
  onRelabel,
  onDelete,
  onSetDefault,
}: EndpointManagerProps) => {
  const [editingLabels, setEditingLabels] = useState<Record<string, string>>({});
  const form = useForm<EndpointFormValues>({
    resolver: zodResolver(endpointFormSchema) as any,
    defaultValues: createEndpointFormDefaults(),
  });

  const sortedEndpoints = useMemo(() => [...endpoints], [endpoints]);

  const handleBind = form.handleSubmit(async (values) => {
    await onBind(values);
    form.reset(createEndpointFormDefaults());
  });

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Telegram endpoints</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Bind verified delivery targets for automation push notifications.
          </p>
        </div>
        {defaultEndpointId ? <Badge variant="secondary">Default set</Badge> : null}
      </div>

      <Form {...form}>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={handleBind}>
          <FormField
            control={form.control as any}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Label</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Daily summary chat" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control as any}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account ID</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="default" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control as any}
            name="chatId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chat ID</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="123456789" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control as any}
            name="threadId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thread ID</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Optional" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="md:col-span-4 flex justify-end">
            <Button type="submit" disabled={isSaving}>
              Bind endpoint
            </Button>
          </div>
        </form>
      </Form>

      <div className="mt-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reply session</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEndpoints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No endpoint bound yet.
                </TableCell>
              </TableRow>
            ) : null}
            {sortedEndpoints.map((endpoint) => {
              const draftLabel = editingLabels[endpoint.id] ?? endpoint.label;
              const isDefault = defaultEndpointId === endpoint.id;
              return (
                <TableRow key={endpoint.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        value={draftLabel}
                        onChange={(event) =>
                          setEditingLabels((prev) => ({
                            ...prev,
                            [endpoint.id]: event.currentTarget.value,
                          }))
                        }
                      />
                      {isDefault ? <Badge variant="secondary">Default</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {endpoint.target.chatId}
                    {endpoint.target.threadId ? ` / ${endpoint.target.threadId}` : ''}
                  </TableCell>
                  <TableCell>
                    <Badge variant={endpoint.verifiedAt ? 'default' : 'outline'}>
                      {endpoint.verifiedAt ? 'Verified' : 'Unverified'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {endpoint.replySessionId}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          isSaving ||
                          draftLabel.trim().length === 0 ||
                          draftLabel === endpoint.label
                        }
                        onClick={() => {
                          void onRelabel(endpoint.id, draftLabel.trim());
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSaving || !endpoint.verifiedAt || isDefault}
                        onClick={() => {
                          void onSetDefault(endpoint.id);
                        }}
                      >
                        Set default
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isSaving || !isDefault}
                        onClick={() => {
                          void onSetDefault(undefined);
                        }}
                      >
                        Clear default
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isSaving}
                        onClick={() => {
                          void onDelete(endpoint.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
