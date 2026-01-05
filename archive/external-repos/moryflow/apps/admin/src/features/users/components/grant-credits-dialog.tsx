/**
 * 发放积分对话框
 */
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { grantCreditsSchema, type GrantCreditsFormData } from '@/lib/validations/user'
import type { CreditType } from '@/types/api'

const CREDIT_TYPE_OPTIONS = [
  { value: 'subscription', label: '订阅积分' },
  { value: 'purchased', label: '购买积分' },
]

interface GrantCreditsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { type: CreditType; amount: number; reason?: string }) => void
  isLoading?: boolean
}

export function GrantCreditsDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: GrantCreditsDialogProps) {
  const form = useForm<GrantCreditsFormData>({
    resolver: zodResolver(grantCreditsSchema),
    defaultValues: {
      type: 'subscription',
      amount: 0,
      reason: '',
    },
  })

  const handleSubmit = (data: GrantCreditsFormData) => {
    onSubmit({
      type: data.type,
      amount: data.amount,
      reason: data.reason || undefined,
    })
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>发放积分</DialogTitle>
          <DialogDescription>为用户发放积分</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>积分类型</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CREDIT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>积分数量</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="输入积分数量"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>原因（可选）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="说明发放原因..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? '发放中...' : '确认发放'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
