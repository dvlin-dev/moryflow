import { useState, useCallback, useMemo } from 'react'
import type { Control, FieldErrors, UseFormRegister, UseFieldArrayReturn, UseFormSetValue } from 'react-hook-form'
import { useWatch } from 'react-hook-form'
import { useMcpStatus } from '@/hooks/use-mcp-status'
import { useTranslation } from '@/lib/i18n'
import type { FormValues } from '../const'
import type { McpServerEntry, McpServerType } from './mcp/constants'
import { McpList } from './mcp/mcp-list'
import { McpDetails } from './mcp/mcp-details'
import { McpEmptyState } from './mcp/mcp-empty-state'
import type { McpPreset } from './mcp/mcp-presets'

type McpSectionProps = {
  control: Control<FormValues>
  register: UseFormRegister<FormValues>
  errors: FieldErrors<FormValues>
  stdioArray: UseFieldArrayReturn<FormValues, 'mcp.stdio', 'id'>
  httpArray: UseFieldArrayReturn<FormValues, 'mcp.streamableHttp', 'id'>
  setValue: UseFormSetValue<FormValues>
  isLoading: boolean
}

/** 构建统一的服务器列表 */
const buildServerList = (
  stdioFields: Array<{ id: string }>,
  httpFields: Array<{ id: string }>,
  stdioValues: FormValues['mcp']['stdio'],
  httpValues: FormValues['mcp']['streamableHttp']
): McpServerEntry[] => {
  const list: McpServerEntry[] = []

  stdioFields.forEach((field, index) => {
    const value = stdioValues?.[index]
    list.push({
      type: 'stdio',
      index,
      id: value?.id || field.id,
      name: value?.name || '',
      enabled: value?.enabled ?? true,
    })
  })

  httpFields.forEach((field, index) => {
    const value = httpValues?.[index]
    list.push({
      type: 'http',
      index,
      id: value?.id || field.id,
      name: value?.name || '',
      enabled: value?.enabled ?? true,
    })
  })

  return list
}

export const McpSection = ({
  control,
  register,
  errors,
  stdioArray,
  httpArray,
  setValue,
  isLoading,
}: McpSectionProps) => {
  const { t } = useTranslation('settings')
  const { getServerById, testServer } = useMcpStatus()
  const [activeIndex, setActiveIndex] = useState(0)

  // 监听表单值
  const stdioValues = useWatch({ control, name: 'mcp.stdio' }) ?? []
  const httpValues = useWatch({ control, name: 'mcp.streamableHttp' }) ?? []

  // 构建统一的服务器列表
  const serverList = useMemo(
    () => buildServerList(stdioArray.fields, httpArray.fields, stdioValues, httpValues),
    [stdioArray.fields, httpArray.fields, stdioValues, httpValues]
  )

  // 获取当前选中的服务器
  const activeServer = serverList[activeIndex]

  // 处理添加新服务器
  const handleAdd = useCallback(() => {
    const newId = crypto.randomUUID()
    stdioArray.append({
      id: newId,
      name: '',
      command: '',
      args: '',
      cwd: '',
      enabled: true,
      env: [],
      autoApprove: false,
    })
    // 选中新添加的服务器
    setActiveIndex(serverList.length)
  }, [stdioArray, serverList.length])

  // 处理从预设添加
  const handleAddPreset = useCallback(
    (preset: McpPreset) => {
      const newId = crypto.randomUUID()
      if (preset.type === 'stdio') {
        stdioArray.append({
          id: newId,
          name: preset.name,
          command: preset.command || '',
          args: preset.args?.join(' ') || '',
          cwd: '',
          enabled: true,
          env: preset.envRequired?.map((key) => ({ key, value: '' })) || [],
          autoApprove: false,
        })
      } else {
        httpArray.append({
          id: newId,
          name: preset.name,
          url: preset.url || '',
          authorizationHeader: '',
          enabled: true,
          headers: [],
          autoApprove: false,
        })
      }
      setActiveIndex(serverList.length)
    },
    [stdioArray, httpArray, serverList.length]
  )

  // 处理删除服务器
  const handleRemove = useCallback(() => {
    if (!activeServer) return

    if (activeServer.type === 'stdio') {
      stdioArray.remove(activeServer.index)
    } else {
      httpArray.remove(activeServer.index)
    }

    // 调整选中索引
    setActiveIndex((current) => Math.max(0, current - 1))
  }, [activeServer, stdioArray, httpArray])

  // 处理类型切换（需要迁移数据）
  const handleTypeChange = useCallback(
    (newType: McpServerType) => {
      if (!activeServer || activeServer.type === newType) return

      // 获取当前数据
      const currentData =
        activeServer.type === 'stdio' ? stdioValues[activeServer.index] : httpValues[activeServer.index]

      if (!currentData) return

      // 删除旧条目
      if (activeServer.type === 'stdio') {
        stdioArray.remove(activeServer.index)
      } else {
        httpArray.remove(activeServer.index)
      }

      // 添加新类型条目
      const newId = crypto.randomUUID()
      if (newType === 'stdio') {
        stdioArray.append({
          id: newId,
          name: currentData.name,
          command: '',
          args: '',
          cwd: '',
          enabled: currentData.enabled,
          env: [],
          autoApprove: false,
        })
      } else {
        httpArray.append({
          id: newId,
          name: currentData.name,
          url: '',
          authorizationHeader: '',
          enabled: currentData.enabled,
          headers: [],
          autoApprove: false,
        })
      }

      // 选中新条目（在列表末尾）
      setActiveIndex(serverList.length - 1)
    },
    [activeServer, stdioValues, httpValues, stdioArray, httpArray, serverList.length]
  )

  // 限制 activeIndex 范围
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, serverList.length - 1))
  if (safeActiveIndex !== activeIndex && serverList.length > 0) {
    setActiveIndex(safeActiveIndex)
  }

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{t('loadingConfig')}</div>
  }

  return (
    <div className="flex h-full gap-4">
      <McpList
        servers={serverList}
        activeIndex={safeActiveIndex}
        onActiveChange={setActiveIndex}
        onAdd={handleAdd}
        getServerState={getServerById}
      />
      <div className="min-w-0 flex-1 overflow-hidden rounded-xl bg-background">
        {serverList.length === 0 ? (
          <McpEmptyState onAdd={handleAdd} onAddPreset={handleAddPreset} />
        ) : activeServer ? (
          <McpDetails
            server={activeServer}
            control={control}
            register={register}
            errors={errors}
            onRemove={handleRemove}
            onTypeChange={handleTypeChange}
            testServer={testServer}
          />
        ) : null}
      </div>
    </div>
  )
}
