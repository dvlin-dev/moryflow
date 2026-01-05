/**
 * 创建 API Key 对话框
 */
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@memai/ui/primitives'
import { Button } from '@memai/ui/primitives'
import { Input } from '@memai/ui/primitives'
import { Label } from '@memai/ui/primitives'
import { Copy, Check, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateApiKey } from '../hooks'
import { storeApiKey } from '../storage'

interface CreateApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
}: CreateApiKeyDialogProps) {
  const [name, setName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { mutate: createKey, isPending } = useCreateApiKey()

  const handleCreate = () => {
    if (!name.trim()) return

    createKey(
      { name: name.trim() },
      {
        onSuccess: (result) => {
          setCreatedKey(result.key)
          // 存储完整 API Key 到 localStorage，以便在 Playground 中使用
          storeApiKey(result.id, result.name, result.key)
        },
      }
    )
  }

  const handleCopy = async () => {
    if (!createdKey) return
    try {
      await navigator.clipboard.writeText(createdKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed, please copy manually')
    }
  }

  const handleClose = () => {
    setName('')
    setCreatedKey(null)
    setCopied(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {createdKey ? 'Save Your API Key' : 'Create API Key'}
          </DialogTitle>
          <DialogDescription>
            {createdKey
              ? 'Copy and save your API Key now. You won\'t be able to see it again after closing.'
              : 'Create a new API Key for your application.'}
          </DialogDescription>
        </DialogHeader>

        {createdKey ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-none text-amber-800">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm">
                This is the only time you'll see the full key. Make sure to save it!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={createdKey}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Production, Test App"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Used to identify the purpose of this key
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {createdKey ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || isPending}
              >
                {isPending ? 'Creating...' : 'Create'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
