import { useState, useEffect, useCallback } from 'react'
import { Input } from '@anyhunt/ui/components/input'
import { Label } from '@anyhunt/ui/components/label'
import { Button } from '@anyhunt/ui/components/button'
import { Switch } from '@anyhunt/ui/components/switch'
import { Badge } from '@anyhunt/ui/components/badge'
import { ScrollArea } from '@anyhunt/ui/components/scroll-area'
import { ExternalLink, RefreshCw, Search, Download, Trash2, Loader2 } from 'lucide-react'
import { getProviderById } from '@shared/model-registry'
import type { SettingsDialogState } from '../../use-settings-dialog'
import type { OllamaLocalModel, OllamaConnectionResult } from '@shared/ipc'
import { ModelLibraryDialog } from './model-library-dialog'

type OllamaPanelProps = {
  providers: SettingsDialogState['providers']
  form: SettingsDialogState['form']
}

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * Ollama 专属面板
 * 提供连接检测、本地模型管理、模型下载等功能
 */
export const OllamaPanel = ({ providers, form }: OllamaPanelProps) => {
  const { providerValues } = providers
  const { setValue, getValues, register } = form

  const preset = getProviderById('ollama')!

  // 状态
  const [connectionStatus, setConnectionStatus] = useState<OllamaConnectionResult | null>(null)
  const [localModels, setLocalModels] = useState<OllamaLocalModel[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [deletingModel, setDeletingModel] = useState<string | null>(null)

  // 获取配置索引
  const presetIndex = providerValues.findIndex((p) => p.providerId === 'ollama')
  const currentConfig = presetIndex >= 0 ? providerValues[presetIndex] : null
  const userModels = currentConfig?.models || []

  // 获取用户配置的 baseUrl
  const customBaseUrl = currentConfig?.baseUrl || undefined

  // 确保配置记录存在（在 useEffect 中调用，避免渲染期间 setState）
  useEffect(() => {
    // 使用 getValues 获取最新值，避免闭包问题和重复添加
    const currentProviders = getValues('providers')
    const existingIndex = currentProviders.findIndex((p) => p.providerId === 'ollama')
    if (existingIndex < 0) {
      setValue('providers', [
        ...currentProviders,
        {
          providerId: 'ollama',
          enabled: false,
          apiKey: '',
          baseUrl: preset.nativeApiBaseUrl || 'http://localhost:11434',
          models: [],
          defaultModelId: null,
        },
      ])
    }
  }, [getValues, setValue, preset.nativeApiBaseUrl])


  /** 检测连接 */
  const checkConnection = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await window.desktopAPI?.ollama.checkConnection(customBaseUrl)
      setConnectionStatus(result ?? { connected: false, error: '未知错误' })
    } catch (error) {
      setConnectionStatus({
        connected: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    setIsLoading(false)
  }, [customBaseUrl])

  /** 获取本地模型列表 */
  const fetchLocalModels = useCallback(async () => {
    setIsLoading(true)
    try {
      const models = await window.desktopAPI?.ollama.getLocalModels(customBaseUrl)
      setLocalModels(models ?? [])
    } catch (error) {
      console.error('Failed to fetch local models:', error)
      setLocalModels([])
    }
    setIsLoading(false)
  }, [customBaseUrl])

  /** 删除模型 */
  const handleDeleteModel = useCallback(async (modelId: string) => {
    setDeletingModel(modelId)
    try {
      const result = await window.desktopAPI?.ollama.deleteModel(modelId, customBaseUrl)
      if (result?.success) {
        // 刷新模型列表
        await fetchLocalModels()
      }
    } catch (error) {
      console.error('Failed to delete model:', error)
    }
    setDeletingModel(null)
  }, [customBaseUrl, fetchLocalModels])

  /** 刷新所有数据 */
  const handleRefresh = useCallback(async () => {
    await Promise.all([checkConnection(), fetchLocalModels()])
  }, [checkConnection, fetchLocalModels])

  // 初始化
  useEffect(() => {
    handleRefresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 搜索过滤
  const filteredModels = localModels.filter((model) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return model.id.toLowerCase().includes(query) || model.name.toLowerCase().includes(query)
  })

  /** 获取模型是否启用 */
  const isModelEnabled = useCallback(
    (modelId: string, modelIndex: number) => {
      const modelConfig = userModels.find((m) => m.id === modelId)
      if (modelConfig) return modelConfig.enabled
      return modelIndex === 0
    },
    [userModels]
  )

  /** 切换模型启用状态 */
  const handleToggleModel = useCallback(
    (modelId: string, enabled: boolean) => {
      if (presetIndex < 0) return

      const currentModels = providerValues[presetIndex]?.models || []
      const existingIndex = currentModels.findIndex((m) => m.id === modelId)

      if (existingIndex >= 0) {
        setValue(`providers.${presetIndex}.models.${existingIndex}.enabled`, enabled)
      } else {
        setValue(`providers.${presetIndex}.models`, [...currentModels, { id: modelId, enabled }])
      }
    },
    [presetIndex, providerValues, setValue]
  )

  /** 模型下载完成回调 */
  const handleModelPulled = useCallback(() => {
    fetchLocalModels()
  }, [fetchLocalModels])

  // 等待配置创建完成后再渲染表单，避免 register 创建不完整的对象
  if (presetIndex < 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        加载中...
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        {/* 服务商信息 */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{preset.name}</h3>
            {preset.description && (
              <p className="text-sm text-muted-foreground mt-1">{preset.description}</p>
            )}
          </div>
          <a
            href={preset.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1 text-sm"
          >
            模型库 <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* 连接状态 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>连接状态</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/30">
            <div
              className={`h-2 w-2 rounded-full ${
                connectionStatus?.connected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm">
              {connectionStatus?.connected
                ? `已连接 (v${connectionStatus.version})`
                : connectionStatus?.error || '未连接'}
            </span>
          </div>
        </div>

        {/* 服务地址 */}
        <div className="space-y-2">
          <Label htmlFor="ollama-base-url">服务地址（可选）</Label>
          <Input
            id="ollama-base-url"
            placeholder={preset.nativeApiBaseUrl}
            {...register(`providers.${presetIndex}.baseUrl` as const)}
            onBlur={handleRefresh}
          />
          <p className="text-xs text-muted-foreground">留空使用默认地址</p>
        </div>

        {/* 本地模型 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>本地模型</Label>
            <span className="text-xs text-muted-foreground">{localModels.length} 个模型</span>
          </div>

          {/* 搜索和下载 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索模型..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="button" variant="outline" onClick={() => setLibraryOpen(true)}>
              <Download className="h-4 w-4 mr-1" />
              下载模型
            </Button>
          </div>

          {/* 模型列表 */}
          {connectionStatus?.connected ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredModels.map((model, modelIndex) => {
                const isEnabled = isModelEnabled(model.id, modelIndex)
                const isDeleting = deletingModel === model.id

                return (
                  <div
                    key={model.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{model.id}</span>
                        {model.capabilities.reasoning && (
                          <Badge variant="secondary" className="text-xs">
                            推理
                          </Badge>
                        )}
                        {model.capabilities.attachment && (
                          <Badge variant="secondary" className="text-xs">
                            多模态
                          </Badge>
                        )}
                        {model.capabilities.toolCall && (
                          <Badge variant="secondary" className="text-xs">
                            工具
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>{formatSize(model.size)}</span>
                        <span>{model.details.quantization_level}</span>
                        <span>上下文: {Math.round(model.limits.context / 1000)}K</span>
                        <button
                          type="button"
                          className="text-destructive hover:underline disabled:opacity-50"
                          onClick={() => handleDeleteModel(model.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggleModel(model.id, checked)}
                    />
                  </div>
                )
              })}
              {filteredModels.length === 0 && localModels.length > 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  没有找到匹配的模型
                </div>
              )}
              {localModels.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  <p>暂无本地模型</p>
                  <p className="mt-1">点击「下载模型」从模型库获取</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-8">
              <p>无法连接到 Ollama 服务</p>
              <p className="mt-1">请确保 Ollama 已安装并运行</p>
              <a
                href="https://ollama.com/download"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline mt-2 inline-block"
              >
                下载 Ollama
              </a>
            </div>
          )}
        </div>

        {/* 模型库对话框 */}
        <ModelLibraryDialog
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          baseUrl={customBaseUrl}
          onModelPulled={handleModelPulled}
        />
      </div>
    </ScrollArea>
  )
}
