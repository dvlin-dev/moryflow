import { useState, useCallback } from 'react'
import { Controller, useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { ScrollArea } from '@anyhunt/ui/components/scroll-area'
import { Button } from '@anyhunt/ui/components/button'
import { Input } from '@anyhunt/ui/components/input'
import { Label } from '@anyhunt/ui/components/label'
import { Switch } from '@anyhunt/ui/components/switch'
import { Checkbox } from '@anyhunt/ui/components/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@anyhunt/ui/components/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@anyhunt/ui/components/alert-dialog'
import { FlaskConical, TrashIcon, CheckCircle2, XCircle, Loader2Icon } from 'lucide-react'
import type { FormValues } from '../../const'
import type { McpServerEntry, McpServerType } from './constants'
import type { McpTestInput, McpTestResult } from '@shared/ipc'
import { McpEnvEditor } from './mcp-env-editor'
import { McpToolList } from './mcp-tool-list'
import { ErrorText } from '../shared'

type McpDetailsProps = {
  server: McpServerEntry
  control: Control<FormValues>
  register: UseFormRegister<FormValues>
  errors: FieldErrors<FormValues>
  onRemove: () => void
  onTypeChange: (newType: McpServerType) => void
  testServer: (input: McpTestInput) => Promise<McpTestResult>
}

export const McpDetails = ({
  server,
  control,
  register,
  errors,
  onRemove,
  onTypeChange,
  testServer,
}: McpDetailsProps) => {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<McpTestResult | null>(null)
  // 保存验证成功后的工具列表，用于在详情页底部显示
  const [verifiedTools, setVerifiedTools] = useState<string[]>([])

  // 根据类型获取表单数据
  const stdioData = useWatch({ control, name: `mcp.stdio.${server.index}` })
  const httpData = useWatch({ control, name: `mcp.streamableHttp.${server.index}` })

  const currentData = server.type === 'stdio' ? stdioData : httpData
  const stdioErrors = errors.mcp?.stdio?.[server.index]
  const httpErrors = errors.mcp?.streamableHttp?.[server.index]

  const handleTest = useCallback(async () => {
    if (!currentData) return

    setTesting(true)
    setTestResult(null)

    try {
      let input: McpTestInput
      if (server.type === 'stdio') {
        const data = currentData as FormValues['mcp']['stdio'][number]
        input = {
          type: 'stdio',
          config: {
            name: data.name || 'Test Server',
            command: data.command,
            args: data.args?.trim() ? data.args.trim().split(/\s+/) : undefined,
            cwd: data.cwd || undefined,
            env:
              data.env && data.env.length > 0
                ? Object.fromEntries(data.env.filter((e) => e.key.trim()).map((e) => [e.key, e.value]))
                : undefined,
          },
        }
      } else {
        const data = currentData as FormValues['mcp']['streamableHttp'][number]
        input = {
          type: 'http',
          config: {
            name: data.name || 'Test Server',
            url: data.url,
            authorizationHeader: data.authorizationHeader || undefined,
            headers:
              data.headers && data.headers.length > 0
                ? Object.fromEntries(data.headers.filter((h) => h.key.trim()).map((h) => [h.key, h.value]))
                : undefined,
          },
        }
      }

      // 打印测试配置日志
      console.log('[mcp-details] 验证 MCP 配置:', JSON.stringify(input, null, 2))

      const result = await testServer(input)
      console.log('[mcp-details] 验证结果:', result)
      setTestResult(result)
      // 验证成功后保存工具列表
      if (result.success && result.toolNames) {
        setVerifiedTools(result.toolNames)
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : '测试失败',
      })
    } finally {
      setTesting(false)
    }
  }, [currentData, server.type, testServer])

  const canTest =
    server.type === 'stdio'
      ? !!(currentData as FormValues['mcp']['stdio'][number])?.command?.trim()
      : !!(currentData as FormValues['mcp']['streamableHttp'][number])?.url?.trim()

  const renderHeader = () => (
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium">{currentData?.name || '未命名服务器'}</p>
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
              <span className="text-muted-foreground">启用</span>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </div>
          )}
        />
        <Button type="button" size="sm" variant="ghost" onClick={handleTest} disabled={testing || !canTest} className="h-7 px-2">
          {testing ? (
            <Loader2Icon className="mr-1 size-3.5 animate-spin" />
          ) : (
            <FlaskConical className="mr-1 size-3.5" />
          )}
          验证
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onRemove} className="h-7 px-2 text-muted-foreground hover:text-destructive">
          <TrashIcon className="mr-1 size-3.5" />
          删除
        </Button>
      </div>
    </div>
  )

  const renderTypeSelector = () => (
    <div className="space-y-2">
      <Label>类型</Label>
      <Select value={server.type} onValueChange={(v) => onTypeChange(v as McpServerType)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="stdio">命令行 (Stdio)</SelectItem>
          <SelectItem value="http">HTTP</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {server.type === 'stdio' ? '通过命令行启动本地 MCP 服务器' : '连接远程 HTTP MCP 服务器'}
      </p>
    </div>
  )

  const renderStdioFields = () => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`stdio-${server.index}-name`}>名称</Label>
          <Input
            id={`stdio-${server.index}-name`}
            placeholder="my-mcp-server"
            {...register(`mcp.stdio.${server.index}.name`)}
          />
          <ErrorText message={stdioErrors?.name?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`stdio-${server.index}-cwd`}>工作目录（可选）</Label>
          <Input
            id={`stdio-${server.index}-cwd`}
            placeholder="/path/to/dir"
            {...register(`mcp.stdio.${server.index}.cwd`)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`stdio-${server.index}-command`}>命令</Label>
        <Input
          id={`stdio-${server.index}-command`}
          placeholder="npx"
          {...register(`mcp.stdio.${server.index}.command`)}
        />
        <ErrorText message={stdioErrors?.command?.message} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`stdio-${server.index}-args`}>参数（空格分隔）</Label>
        <Input
          id={`stdio-${server.index}-args`}
          placeholder="-y firecrawl-mcp"
          {...register(`mcp.stdio.${server.index}.args`)}
        />
      </div>
      <McpEnvEditor
        control={control}
        name={`mcp.stdio.${server.index}.env`}
        label="环境变量"
        keyPlaceholder="API_KEY"
        valuePlaceholder="your-api-key"
      />
      <Controller
        control={control}
        name={`mcp.stdio.${server.index}.autoApprove`}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Checkbox id={`stdio-${server.index}-autoApprove`} checked={field.value} onCheckedChange={field.onChange} />
            <Label htmlFor={`stdio-${server.index}-autoApprove`} className="text-sm font-normal">
              自动执行工具（无需确认）
            </Label>
          </div>
        )}
      />
    </>
  )

  const renderHttpFields = () => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`http-${server.index}-name`}>名称</Label>
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
        <Label htmlFor={`http-${server.index}-auth`}>Authorization Header（可选）</Label>
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
        label="自定义请求头"
        keyPlaceholder="X-Custom-Header"
        valuePlaceholder="value"
      />
      <Controller
        control={control}
        name={`mcp.streamableHttp.${server.index}.autoApprove`}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Checkbox id={`http-${server.index}-autoApprove`} checked={field.value} onCheckedChange={field.onChange} />
            <Label htmlFor={`http-${server.index}-autoApprove`} className="text-sm font-normal">
              自动执行工具（无需确认）
            </Label>
          </div>
        )}
      />
    </>
  )

  const renderTestDialog = () => (
    <AlertDialog open={!!testResult} onOpenChange={() => setTestResult(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {testResult?.success ? (
              <>
                <CheckCircle2 className="size-5 text-green-600" />
                验证成功
              </>
            ) : (
              <>
                <XCircle className="size-5 text-red-600" />
                验证失败
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {testResult?.success ? (
                <>
                  <p>成功连接到 MCP 服务器</p>
                  {testResult.toolNames && testResult.toolNames.length > 0 && (
                    <McpToolList toolNames={testResult.toolNames} />
                  )}
                </>
              ) : (
                <p className="whitespace-pre-wrap text-destructive">{testResult?.error}</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>确定</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  const renderToolCards = () => {
    if (verifiedTools.length === 0) return null
    return (
      <div className="space-y-3 pt-4">
        <p className="text-xs font-medium text-muted-foreground">已验证的工具 ({verifiedTools.length})</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {verifiedTools.map((name) => (
            <div
              key={name}
              className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5"
            >
              <div className="size-1.5 shrink-0 rounded-full bg-success" />
              <span className="truncate font-mono text-xs">{name}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="space-y-4 p-4">
          {renderHeader()}
          <div className="space-y-4 pt-2">
            {renderTypeSelector()}
            {server.type === 'stdio' ? renderStdioFields() : renderHttpFields()}
          </div>
          {renderToolCards()}
        </div>
      </ScrollArea>
      {renderTestDialog()}
    </>
  )
}
