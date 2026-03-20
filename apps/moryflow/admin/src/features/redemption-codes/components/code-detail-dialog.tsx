import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import { CODE_TYPE_LABEL } from '../const';
import type { RedemptionCodeDetail } from '../types';

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

interface Props {
  code: RedemptionCodeDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CodeDetailDialog({ code, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>兑换码详情</DialogTitle>
          <DialogDescription>
            {code ? <code className="font-mono">{code.code}</code> : '未选择'}
          </DialogDescription>
        </DialogHeader>

        {code && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-1">
              <Row label="类型">
                <Badge variant="outline">{CODE_TYPE_LABEL[code.type] ?? code.type}</Badge>
              </Row>
              {code.type === 'CREDITS' && <Row label="积分数量">{code.creditsAmount ?? '-'}</Row>}
              {code.type === 'MEMBERSHIP' && (
                <>
                  <Row label="会员等级">
                    {code.membershipTier ? capitalize(code.membershipTier) : '-'}
                  </Row>
                  <Row label="会员天数">{code.membershipDays ?? '-'}</Row>
                </>
              )}
              <Row label="使用情况">
                {code.currentRedemptions}/{code.maxRedemptions}
              </Row>
              <Row label="状态">
                <Badge variant={code.isActive ? 'default' : 'secondary'}>
                  {code.isActive ? '活跃' : '已停用'}
                </Badge>
              </Row>
              <Row label="过期时间">
                {code.expiresAt ? formatDateTime(code.expiresAt) : '永不过期'}
              </Row>
              <Row label="创建者">
                {code.creator?.email ?? code.createdBy}
                {code.creator?.name ? ` (${code.creator.name})` : ''}
              </Row>
              <Row label="创建时间">{formatDateTime(code.createdAt)}</Row>
              {code.note && <Row label="备注">{code.note}</Row>}
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">使用记录 ({code.usages?.length ?? 0})</h3>
              {code.usages && code.usages.length > 0 ? (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>用户</TableHead>
                        <TableHead>兑换时间</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>数量/等级</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {code.usages.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="text-sm">
                            {u.userEmail ?? (
                              <span className="font-mono text-xs">{u.userId.slice(0, 8)}...</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateTime(u.redeemedAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{CODE_TYPE_LABEL[u.type] ?? u.type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {u.type === 'CREDITS'
                              ? (u.creditsAmount ?? '-')
                              : `${u.membershipTier ? capitalize(u.membershipTier) : '-'} / ${u.membershipDays ?? '-'}天`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">暂无使用记录</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
