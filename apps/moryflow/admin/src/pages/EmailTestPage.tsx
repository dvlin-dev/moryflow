/**
 * 邮件测试页面
 * 用于测试邮件服务和向特定用户发送邮件
 */
import { useState } from 'react'
import { PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TiptapEditor, isEditorEmpty } from '@/components/ui/tiptap-editor'
import { toast } from 'sonner'
import { Loader2, Mail, Send } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { ADMIN_API } from '@/lib/api-paths'

export default function EmailTestPage() {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSend = async () => {
    if (!to || !subject || isEditorEmpty(html)) {
      toast.error('请填写完整的邮件信息')
      return
    }

    setIsSending(true)

    try {
      await apiClient.post<{ success: boolean }>(`${ADMIN_API.EMAIL}/send`, {
        to,
        subject,
        html,
      })

      toast.success('邮件发送成功')
      // 清空表单
      setTo('')
      setSubject('')
      setHtml('')
    } catch (error) {
      console.error('Send email error:', error)
      toast.error(error instanceof Error ? error.message : '发送失败')
    } finally {
      setIsSending(false)
    }
  }

  const isFormValid = to.trim() && subject.trim() && !isEditorEmpty(html)

  return (
    <div className="space-y-6">
      <PageHeader
        title="邮件测试"
        description="测试邮件服务或向特定用户发送邮件"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-5 w-5" />
            发送邮件
          </CardTitle>
          <CardDescription>
            使用 Markdown 快捷键编写邮件内容（如 # 标题、** 加粗、* 列表等）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="to">收件人邮箱 *</Label>
              <Input
                id="to"
                type="email"
                placeholder="user@example.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={isSending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">邮件主题 *</Label>
              <Input
                id="subject"
                placeholder="邮件主题"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isSending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>邮件正文 *</Label>
            <TiptapEditor
              value={html}
              onChange={setHtml}
              placeholder="输入邮件内容...

使用 Markdown 快捷键:
# 一级标题
## 二级标题
**加粗** *斜体*
- 无序列表
1. 有序列表
> 引用"
              disabled={isSending}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={isSending || !isFormValid}>
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              发送邮件
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. 输入收件人邮箱地址</p>
          <p>2. 输入邮件主题</p>
          <p>3. 在编辑器中编写邮件内容，支持 Markdown 快捷键：</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><code>#</code> + 空格 = 一级标题</li>
            <li><code>##</code> + 空格 = 二级标题</li>
            <li><code>*</code> 或 <code>-</code> + 空格 = 无序列表</li>
            <li><code>1.</code> + 空格 = 有序列表</li>
            <li><code>&gt;</code> + 空格 = 引用</li>
            <li><code>`code`</code> = 行内代码</li>
            <li><code>```</code> = 代码块</li>
          </ul>
          <p>4. 点击"发送邮件"按钮</p>
          <p className="mt-4 text-yellow-600 dark:text-yellow-400">
            注意：确保后端已配置 RESEND_API_KEY 环境变量
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
