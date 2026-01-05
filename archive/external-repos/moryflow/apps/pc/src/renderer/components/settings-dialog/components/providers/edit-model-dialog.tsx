import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@moryflow/ui/components/dialog'
import { Input } from '@moryflow/ui/components/input'
import { Label } from '@moryflow/ui/components/label'
import { Button } from '@moryflow/ui/components/button'
import { Checkbox } from '@moryflow/ui/components/checkbox'
import type { ModelModality } from '@shared/model-registry'
import type { CustomCapabilities } from './add-model-dialog'

export type EditModelFormData = {
  id: string
  name: string
  contextSize: number
  outputSize: number
  capabilities: CustomCapabilities
  inputModalities: ModelModality[]
}

export type EditModelInitialData = {
  id: string
  name: string
  isPreset: boolean
  isCustom?: boolean
  capabilities?: { reasoning: boolean; attachment: boolean; toolCall?: boolean; temperature?: boolean }
  limits: { context: number; output: number }
  inputModalities?: ModelModality[]
}

type EditModelDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: EditModelFormData) => void
  initialData: EditModelInitialData | null
}

/** 默认能力 */
const DEFAULT_CAPABILITIES: CustomCapabilities = {
  attachment: false,
  reasoning: false,
  temperature: true,
  toolCall: true,
}

const DEFAULT_INPUT_MODALITIES: ModelModality[] = ['text']

/** 输入模态选项 */
const INPUT_MODALITY_OPTIONS: { value: ModelModality; label: string }[] = [
  { value: 'text', label: '文本' },
  { value: 'image', label: '图片' },
  { value: 'audio', label: '音频' },
  { value: 'video', label: '视频' },
  { value: 'pdf', label: 'PDF' },
]

/** 能力选项 */
const CAPABILITY_OPTIONS: { key: keyof CustomCapabilities; label: string; description: string }[] = [
  { key: 'attachment', label: '多模态输入', description: '支持图片、文件等附件' },
  { key: 'reasoning', label: '推理模式', description: '支持深度思考/推理' },
  { key: 'temperature', label: '温度调节', description: '支持调节生成随机性' },
  { key: 'toolCall', label: '工具调用', description: '支持 Function Calling' },
]

export const EditModelDialog = ({
  open,
  onOpenChange,
  onSave,
  initialData,
}: EditModelDialogProps) => {
  const [modelName, setModelName] = useState('')
  const [contextSize, setContextSize] = useState(128000)
  const [outputSize, setOutputSize] = useState(16384)
  const [capabilities, setCapabilities] = useState<CustomCapabilities>(DEFAULT_CAPABILITIES)
  const [inputModalities, setInputModalities] = useState<ModelModality[]>(DEFAULT_INPUT_MODALITIES)
  const [error, setError] = useState<string | null>(null)

  // 当初始数据变化时，重置表单
  useEffect(() => {
    if (initialData && open) {
      setModelName(initialData.name)
      setContextSize(initialData.limits.context)
      setOutputSize(initialData.limits.output)
      setCapabilities({
        attachment: initialData.capabilities?.attachment ?? false,
        reasoning: initialData.capabilities?.reasoning ?? false,
        temperature: initialData.capabilities?.temperature ?? true,
        toolCall: initialData.capabilities?.toolCall ?? true,
      })
      setInputModalities(initialData.inputModalities || ['text'])
      setError(null)
    }
  }, [initialData, open])

  const handleSubmit = () => {
    setError(null)

    const trimmedName = modelName.trim()
    if (!trimmedName) {
      setError('请填写模型名称')
      return
    }

    onSave({
      id: initialData!.id,
      name: trimmedName,
      contextSize,
      outputSize,
      capabilities,
      inputModalities,
    })

    onOpenChange(false)
  }

  const toggleCapability = (key: keyof CustomCapabilities) => {
    setCapabilities((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleModality = (modality: ModelModality) => {
    setInputModalities((prev) => {
      if (prev.includes(modality)) {
        if (modality === 'text' && prev.length === 1) return prev
        return prev.filter((m) => m !== modality)
      }
      return [...prev, modality]
    })
  }

  if (!initialData) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData.isPreset ? '自定义模型配置' : '编辑自定义模型'}
          </DialogTitle>
        </DialogHeader>
        <div>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* 模型 ID（只读） */}
            <div className="space-y-2">
              <Label>模型 ID</Label>
              <Input value={initialData.id} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                {initialData.isPreset ? '预设模型 ID 不可修改' : 'API 调用时使用的模型标识符'}
              </p>
            </div>

            {/* 模型名称 */}
            <div className="space-y-2">
              <Label htmlFor="edit-model-name">
                显示名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-model-name"
                placeholder="例如: GPT-4o (2024-11)"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">显示在界面上的名称</p>
            </div>

            {/* Token 限制 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-context-size">上下文窗口</Label>
                <Input
                  id="edit-context-size"
                  type="number"
                  min={1000}
                  max={10000000}
                  value={contextSize}
                  onChange={(e) => setContextSize(parseInt(e.target.value) || 128000)}
                />
                <p className="text-xs text-muted-foreground">
                  {Math.round(contextSize / 1000)}K tokens
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-output-size">最大输出</Label>
                <Input
                  id="edit-output-size"
                  type="number"
                  min={1000}
                  max={1000000}
                  value={outputSize}
                  onChange={(e) => setOutputSize(parseInt(e.target.value) || 16384)}
                />
                <p className="text-xs text-muted-foreground">
                  {Math.round(outputSize / 1000)}K tokens
                </p>
              </div>
            </div>

            {/* 模型能力 */}
            <div className="space-y-3">
              <Label>模型能力</Label>
              <div className="grid grid-cols-2 gap-3">
                {CAPABILITY_OPTIONS.map((option) => (
                  <div
                    key={option.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleCapability(option.key)}
                    onKeyDown={(e) => e.key === 'Enter' && toggleCapability(option.key)}
                    className="flex items-center gap-3 rounded-md border p-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Checkbox
                      checked={capabilities[option.key]}
                      onCheckedChange={() => toggleCapability(option.key)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">{option.label}</div>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 输入模态 */}
            <div className="space-y-3">
              <Label>支持的输入类型</Label>
              <div className="flex flex-wrap gap-2">
                {INPUT_MODALITY_OPTIONS.map((option) => {
                  const isDisabled = option.value === 'text' && inputModalities.length === 1
                  return (
                    <div
                      key={option.value}
                      role="button"
                      tabIndex={isDisabled ? -1 : 0}
                      onClick={() => !isDisabled && toggleModality(option.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !isDisabled && toggleModality(option.value)}
                      aria-disabled={isDisabled}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer aria-disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:hover:bg-transparent"
                    >
                      <Checkbox
                        checked={inputModalities.includes(option.value)}
                        onCheckedChange={() => toggleModality(option.value)}
                        disabled={isDisabled}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                选择模型支持的输入类型，文本为必选
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleSubmit}>
              保存
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
