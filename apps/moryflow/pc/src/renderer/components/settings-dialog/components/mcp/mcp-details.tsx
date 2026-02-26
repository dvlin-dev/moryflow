import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import { Button } from '@moryflow/ui/components/button';
import { Input } from '@moryflow/ui/components/input';
import { Label } from '@moryflow/ui/components/label';
import { Switch } from '@moryflow/ui/components/switch';
import { Checkbox } from '@moryflow/ui/components/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui/components/select';
import { Delete, Loader, TestTube } from 'lucide-react';
import type { FormValues } from '../../const';
import type { McpServerEntry, McpServerType } from './constants';
import type { McpTestInput, McpTestResult } from '@shared/ipc';
import { McpEnvEditor } from './mcp-env-editor';
import { ErrorText } from '../shared';
import { useMcpDetailsTest } from './use-mcp-details-test';
import { McpTestResultDialog } from './mcp-test-result-dialog';
import { McpVerifiedTools } from './mcp-verified-tools';

type McpDetailsProps = {
  server: McpServerEntry;
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  onRemove: () => void;
  onTypeChange: (newType: McpServerType) => void;
  testServer: (input: McpTestInput) => Promise<McpTestResult>;
};

export const McpDetails = ({
  server,
  control,
  register,
  errors,
  onRemove,
  onTypeChange,
  testServer,
}: McpDetailsProps) => {
  // 根据类型获取表单数据
  const stdioData = useWatch({ control, name: `mcp.stdio.${server.index}` });
  const httpData = useWatch({ control, name: `mcp.streamableHttp.${server.index}` });

  const currentData = server.type === 'stdio' ? stdioData : httpData;
  const stdioErrors = errors.mcp?.stdio?.[server.index];
  const httpErrors = errors.mcp?.streamableHttp?.[server.index];

  const { testing, testResult, verifiedTools, handleTest, closeTestResult } = useMcpDetailsTest({
    currentData,
    serverType: server.type,
    testServer,
  });

  const canTest =
    server.type === 'stdio'
      ? !!(currentData as FormValues['mcp']['stdio'][number])?.command?.trim()
      : !!(currentData as FormValues['mcp']['streamableHttp'][number])?.url?.trim();

  const renderHeader = () => (
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium">{currentData?.name || 'Untitled server'}</p>
      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name={
            server.type === 'stdio'
              ? `mcp.stdio.${server.index}.enabled`
              : `mcp.streamableHttp.${server.index}.enabled`
          }
          render={({ field }) => (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Enabled</span>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </div>
          )}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleTest}
          disabled={testing || !canTest}
          className="h-7 px-2"
        >
          {testing ? (
            <Loader className="mr-1 size-3.5 animate-spin" />
          ) : (
            <TestTube className="mr-1 size-3.5" />
          )}
          Test
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="h-7 px-2 text-muted-foreground hover:text-destructive"
        >
          <Delete className="mr-1 size-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );

  const renderTypeSelector = () => (
    <div className="space-y-2">
      <Label>Type</Label>
      <Select value={server.type} onValueChange={(v) => onTypeChange(v as McpServerType)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="stdio">Command Line (Stdio)</SelectItem>
          <SelectItem value="http">HTTP</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {server.type === 'stdio'
          ? 'Launch a local MCP server via command line'
          : 'Connect to a remote HTTP MCP server'}
      </p>
    </div>
  );

  const renderStdioFields = () => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`stdio-${server.index}-name`}>Name</Label>
          <Input
            id={`stdio-${server.index}-name`}
            placeholder="my-mcp-server"
            {...register(`mcp.stdio.${server.index}.name`)}
          />
          <ErrorText message={stdioErrors?.name?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`stdio-${server.index}-cwd`}>Working directory (optional)</Label>
          <Input
            id={`stdio-${server.index}-cwd`}
            placeholder="/path/to/dir"
            {...register(`mcp.stdio.${server.index}.cwd`)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`stdio-${server.index}-command`}>Command</Label>
        <Input
          id={`stdio-${server.index}-command`}
          placeholder="npx"
          {...register(`mcp.stdio.${server.index}.command`)}
        />
        <ErrorText message={stdioErrors?.command?.message} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`stdio-${server.index}-args`}>Arguments (space-separated)</Label>
        <Input
          id={`stdio-${server.index}-args`}
          placeholder="-y firecrawl-mcp"
          {...register(`mcp.stdio.${server.index}.args`)}
        />
      </div>
      <McpEnvEditor
        control={control}
        name={`mcp.stdio.${server.index}.env`}
        label="Environment variables"
        keyPlaceholder="API_KEY"
        valuePlaceholder="your-api-key"
      />
      <Controller
        control={control}
        name={`mcp.stdio.${server.index}.autoApprove`}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`stdio-${server.index}-autoApprove`}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
            <Label htmlFor={`stdio-${server.index}-autoApprove`} className="text-sm font-normal">
              Auto-run tools (no confirmation)
            </Label>
          </div>
        )}
      />
    </>
  );

  const renderHttpFields = () => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`http-${server.index}-name`}>Name</Label>
          <Input
            id={`http-${server.index}-name`}
            placeholder="my-http-mcp"
            {...register(`mcp.streamableHttp.${server.index}.name`)}
          />
          <ErrorText message={httpErrors?.name?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`http-${server.index}-url`}>URL</Label>
          <Input
            id={`http-${server.index}-url`}
            placeholder="https://api.example.com/mcp"
            {...register(`mcp.streamableHttp.${server.index}.url`)}
          />
          <ErrorText message={httpErrors?.url?.message} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`http-${server.index}-auth`}>Authorization header (optional)</Label>
        <Input
          id={`http-${server.index}-auth`}
          type="password"
          placeholder="Bearer your-token"
          {...register(`mcp.streamableHttp.${server.index}.authorizationHeader`)}
        />
      </div>
      <McpEnvEditor
        control={control}
        name={`mcp.streamableHttp.${server.index}.headers`}
        label="Custom headers"
        keyPlaceholder="X-Custom-Header"
        valuePlaceholder="value"
      />
      <Controller
        control={control}
        name={`mcp.streamableHttp.${server.index}.autoApprove`}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`http-${server.index}-autoApprove`}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
            <Label htmlFor={`http-${server.index}-autoApprove`} className="text-sm font-normal">
              Auto-run tools (no confirmation)
            </Label>
          </div>
        )}
      />
    </>
  );

  return (
    <>
      <ScrollArea className="h-full">
        <div className="space-y-4 p-4">
          {renderHeader()}
          <div className="space-y-4 pt-2">
            {renderTypeSelector()}
            {server.type === 'stdio' ? renderStdioFields() : renderHttpFields()}
          </div>
          <McpVerifiedTools toolNames={verifiedTools} />
        </div>
      </ScrollArea>
      <McpTestResultDialog result={testResult} onClose={closeTestResult} />
    </>
  );
};
