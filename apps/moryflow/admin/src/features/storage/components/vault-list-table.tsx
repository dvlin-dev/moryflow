/**
 * Vault 列表表格
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/shared';
import { Icon } from '@/components/ui/icon';
import { Delete01Icon, ViewIcon } from '@hugeicons/core-free-icons';
import { formatBytes } from '../const';
import { formatDate } from '@/lib/format';
import type { VaultListItem } from '@/types/storage';

interface VaultListTableProps {
  vaults: VaultListItem[];
  isLoading: boolean;
  onViewDetail: (vault: VaultListItem) => void;
  onDelete: (vault: VaultListItem) => void;
}

export function VaultListTable({ vaults, isLoading, onViewDetail, onDelete }: VaultListTableProps) {
  if (isLoading) {
    return (
      <TableSkeleton
        columns={[
          { width: 'w-32' },
          { width: 'w-40' },
          { width: 'w-16' },
          { width: 'w-24' },
          { width: 'w-16' },
          { width: 'w-32' },
          { width: 'w-20' },
        ]}
        rows={10}
      />
    );
  }

  if (vaults.length === 0) {
    return <div className="text-center py-10 text-muted-foreground">暂无数据</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vault 名称</TableHead>
          <TableHead>用户</TableHead>
          <TableHead className="text-right">文件数</TableHead>
          <TableHead className="text-right">存储大小</TableHead>
          <TableHead className="text-right">设备数</TableHead>
          <TableHead>创建时间</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vaults.map((vault) => (
          <TableRow key={vault.id}>
            <TableCell className="font-medium">{vault.name}</TableCell>
            <TableCell>
              <div className="text-sm">{vault.userEmail}</div>
              {vault.userName && (
                <div className="text-xs text-muted-foreground">{vault.userName}</div>
              )}
            </TableCell>
            <TableCell className="text-right">{vault.fileCount}</TableCell>
            <TableCell className="text-right">{formatBytes(vault.totalSize)}</TableCell>
            <TableCell className="text-right">{vault.deviceCount}</TableCell>
            <TableCell>{formatDate(vault.createdAt)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewDetail(vault)}
                  title="查看详情"
                >
                  <Icon icon={ViewIcon} className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(vault)}
                  title="删除"
                  className="text-destructive hover:text-destructive"
                >
                  <Icon icon={Delete01Icon} className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
