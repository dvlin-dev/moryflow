import { useState, useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, CircleCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRedemptionCodeConfig } from '../hooks';
import type { CreateRedemptionCodeRequest, RedemptionCode } from '../types';

const schema = z
  .object({
    type: z.enum(['CREDITS', 'MEMBERSHIP']),
    creditsAmount: z.coerce.number().int().min(1).max(1_000_000).optional(),
    membershipTier: z.string().min(1).optional(),
    membershipDays: z.coerce.number().int().min(1).max(365).optional(),
    maxRedemptions: z.coerce.number().int().min(1).max(100_000).optional().default(1),
    code: z.string().trim().toUpperCase().min(3).max(20).optional().or(z.literal('')),
    expiresAt: z.string().optional().or(z.literal('')),
    note: z.string().max(500).optional().or(z.literal('')),
  })
  .refine(
    (d) => {
      if (d.type === 'CREDITS') return d.creditsAmount != null && d.creditsAmount > 0;
      if (d.type === 'MEMBERSHIP') return !!d.membershipTier && !!d.membershipDays;
      return true;
    },
    { message: '积分码需要填写积分数量；会员码需要填写等级和天数' }
  );

type FormValues = z.infer<typeof schema>;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <CircleCheck className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
      {copied ? '已复制' : '复制'}
    </Button>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (values: CreateRedemptionCodeRequest) => Promise<RedemptionCode>;
}

export function CreateCodeDialog({ open, onOpenChange, isPending, onSubmit }: Props) {
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { type: 'CREDITS', maxRedemptions: 1, code: '', expiresAt: '', note: '' },
  });

  const { data: config } = useRedemptionCodeConfig();
  const selectedType = form.watch('type');

  useEffect(() => {
    if (open) {
      form.reset({ type: 'CREDITS', maxRedemptions: 1, code: '', expiresAt: '', note: '' });
      setCreatedCode(null);
    }
  }, [form, open]);

  const handleSubmit = async (values: FormValues) => {
    const payload: CreateRedemptionCodeRequest = {
      type: values.type,
      ...(values.creditsAmount != null && { creditsAmount: values.creditsAmount }),
      ...(values.membershipTier && { membershipTier: values.membershipTier }),
      ...(values.membershipDays != null && { membershipDays: values.membershipDays }),
      ...(values.maxRedemptions != null && { maxRedemptions: values.maxRedemptions }),
      ...(values.code && { code: values.code }),
      ...(values.expiresAt && {
        expiresAt: new Date(values.expiresAt).toISOString(),
      }),
      ...(values.note && { note: values.note }),
    };
    try {
      const result = await onSubmit(payload);
      setCreatedCode(result.code);
    } catch {
      // error already handled by mutation hook
    }
  };

  if (createdCode) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>创建成功</DialogTitle>
            <DialogDescription>兑换码已创建，请复制保存</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-6">
            <code className="rounded-lg bg-muted px-4 py-3 font-mono text-lg tracking-wider">
              {createdCode}
            </code>
            <CopyButton text={createdCode} />
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>创建兑换码</DialogTitle>
          <DialogDescription>创建积分或会员兑换码</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>类型</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CREDITS">积分</SelectItem>
                      <SelectItem value="MEMBERSHIP">会员</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedType === 'CREDITS' && (
              <FormField
                control={form.control}
                name="creditsAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>积分数量</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="例如 100"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedType === 'MEMBERSHIP' && (
              <>
                <FormField
                  control={form.control}
                  name="membershipTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>会员等级</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择等级" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(config?.tiers ?? []).map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
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
                  name="membershipDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>会员天数</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="例如 30"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="maxRedemptions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>最大兑换次数</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="1" {...field} value={field.value ?? 1} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>自定义码（可选）</FormLabel>
                  <FormControl>
                    <Input placeholder="留空自动生成" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>过期时间（可选）</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注（可选）</FormLabel>
                  <FormControl>
                    <Input placeholder="内部备注" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? '创建中...' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
