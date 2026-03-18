import { useTranslation } from '@/lib/i18n';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui/components/select';
import { Delete, Loader, Play } from 'lucide-react';
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
  const { t } = useTranslation('settings');
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
      ? !!(currentData as FormValues['mcp']['stdio'][number])?.packageName?.trim()
      : !!(currentData as FormValues['mcp']['streamableHttp'][number])?.url?.trim();

  const renderHeader = () => (
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium">{currentData?.name || t('mcpUntitledServer')}</p>
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
              <span className="text-muted-foreground">{t('mcpEnabled')}</span>
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
            <Play className="mr-1 size-3.5" />
          )}
          {t('mcpTest')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="h-7 px-2 text-muted-foreground hover:text-destructive"
        >
          <Delete className="mr-1 size-3.5" />
          {t('mcpDelete')}
        </Button>
      </div>
    </div>
  );

  const renderTypeSelector = () => (
    <div className="space-y-2">
      <Label>{t('mcpTypeLabel')}</Label>
      <Select value={server.type} onValueChange={(v) => onTypeChange(v as McpServerType)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="stdio">{t('mcpTypeStdioOption')}</SelectItem>
          <SelectItem value="http">{t('mcpTypeHttpOption')}</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {server.type === 'stdio' ? t('mcpStdioDescription') : t('mcpHttpDescription')}
      </p>
    </div>
  );

  const renderStdioFields = () => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`stdio-${server.index}-name`}>{t('mcpNameLabel')}</Label>
          <Input
            id={`stdio-${server.index}-name`}
            placeholder="my-mcp-server"
            {...register(`mcp.stdio.${server.index}.name`)}
          />
          <ErrorText message={stdioErrors?.name?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`stdio-${server.index}-binName`}>{t('mcpBinNameLabel')}</Label>
          <Input
            id={`stdio-${server.index}-binName`}
            placeholder="my-mcp-cli"
            {...register(`mcp.stdio.${server.index}.binName`)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`stdio-${server.index}-packageName`}>{t('mcpNpmPackageLabel')}</Label>
        <Input
          id={`stdio-${server.index}-packageName`}
          placeholder="@scope/my-mcp"
          {...register(`mcp.stdio.${server.index}.packageName`)}
        />
        <ErrorText message={stdioErrors?.packageName?.message} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`stdio-${server.index}-args`}>{t('mcpArgumentsLabel')}</Label>
        <Input
          id={`stdio-${server.index}-args`}
          placeholder="-y firecrawl-mcp"
          {...register(`mcp.stdio.${server.index}.args`)}
        />
      </div>
      <McpEnvEditor
        control={control}
        name={`mcp.stdio.${server.index}.env`}
        label={t('mcpEnvVarsLabel')}
        keyPlaceholder="API_KEY"
        valuePlaceholder="your-api-key"
      />
    </>
  );

  const renderHttpFields = () => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`http-${server.index}-name`}>{t('mcpNameLabel')}</Label>
          <Input
            id={`http-${server.index}-name`}
            placeholder="my-http-mcp"
            {...register(`mcp.streamableHttp.${server.index}.name`)}
          />
          <ErrorText message={httpErrors?.name?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`http-${server.index}-url`}>{t('mcpUrlLabel')}</Label>
          <Input
            id={`http-${server.index}-url`}
            placeholder="https://api.example.com/mcp"
            {...register(`mcp.streamableHttp.${server.index}.url`)}
          />
          <ErrorText message={httpErrors?.url?.message} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`http-${server.index}-auth`}>{t('mcpAuthHeaderLabel')}</Label>
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
        label={t('mcpCustomHeadersLabel')}
        keyPlaceholder="X-Custom-Header"
        valuePlaceholder="value"
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
