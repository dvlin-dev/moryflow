/**
 * 设置用户等级对话框
 */
import { useEffect } from 'react'
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
import { setTierSchema, type SetTierFormData } from '@/lib/validations/user'
import { TIER_OPTIONS } from '@/constants/tier'
import type { UserTier } from '@/types/api'

interface SetTierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTier: UserTier
  onSubmit: (tier: UserTier) => void
  isLoading?: boolean
}

export function SetTierDialog({
  open,
  onOpenChange,
  currentTier,
  onSubmit,
  isLoading,
}: SetTierDialogProps) {
  const form = useForm<SetTierFormData>({
    resolver: zodResolver(setTierSchema),
    defaultValues: {
      tier: currentTier,
    },
  })

  const handleSubmit = (data: SetTierFormData) => {
    onSubmit(data.tier)
  }

  useEffect(() => {
    if (!open) {
      return
    }

    form.reset({ tier: currentTier })
  }, [currentTier, open, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>设置用户等级</DialogTitle>
          <DialogDescription>选择新的用户等级</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>用户等级</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择等级" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIER_OPTIONS.map((option) => (
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? '保存中...' : '确认'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
