/**
 * Vault 详情弹窗
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatBytes, getTierDisplayName } from '../const';
import { formatDate } from '@/lib/format';
import { Icon } from '@/components/ui/icon';
import type { VaultDetailResponse, VaultDevice, VaultFile } from '@/types/storage';
import {
  File01Icon,
  FolderOpenIcon,
  HardDriveIcon,
  MobileNavigator01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';

interface VaultDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: VaultDetailResponse | null;
  isLoading: boolean;
  onDelete?: () => void;
}

export function VaultDetailDialog({
  open,
  onOpenChange,
  data,
  isLoading,
  onDelete,
}: VaultDetailDialogProps) {
  // 加载态
  const renderLoading = () => (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );

  // 基本信息
  const renderBasicInfo = () => {
    if (!data) return null;
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Icon icon={FolderOpenIcon} className="h-4 w-4" />
          基本信息
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">名称：</span>
            <span className="font-medium">{data.vault.name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">创建时间：</span>
            <span>{formatDate(data.vault.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  };

  // 用户信息
  const renderUserInfo = () => {
    if (!data) return null;
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Icon icon={UserIcon} className="h-4 w-4" />
          所属用户
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">邮箱：</span>
            <span>{data.vault.user.email}</span>
          </div>
          <div>
            <span className="text-muted-foreground">等级：</span>
            <Badge variant="outline">{getTierDisplayName(data.vault.user.subscriptionTier)}</Badge>
          </div>
          {data.vault.user.name && (
            <div>
              <span className="text-muted-foreground">名称：</span>
              <span>{data.vault.user.name}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 统计信息
  const renderStats = () => {
    if (!data) return null;
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Icon icon={HardDriveIcon} className="h-4 w-4" />
          统计信息
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{data.stats.fileCount}</div>
            <div className="text-xs text-muted-foreground">文件数</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{formatBytes(data.stats.totalSize)}</div>
            <div className="text-xs text-muted-foreground">存储大小</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{data.stats.deviceCount}</div>
            <div className="text-xs text-muted-foreground">设备数</div>
          </div>
        </div>
      </div>
    );
  };

  // 设备列表
  const renderDevices = () => {
    if (!data) return null;
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Icon icon={MobileNavigator01Icon} className="h-4 w-4" />
          已注册设备 ({data.devices.length})
        </h4>
        {data.devices.length > 0 ? (
          <div className="space-y-2">
            {data.devices.map((device: VaultDevice) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-2 bg-muted rounded text-sm"
              >
                <span className="font-medium">{device.deviceName}</span>
                <span className="text-muted-foreground">
                  {device.lastSyncAt ? `最后同步: ${formatDate(device.lastSyncAt)}` : '从未同步'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">暂无注册设备</div>
        )}
      </div>
    );
  };

  // 最近文件
  const renderRecentFiles = () => {
    if (!data) return null;
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Icon icon={File01Icon} className="h-4 w-4" />
          最近文件 ({data.recentFiles.length})
        </h4>
        {data.recentFiles.length > 0 ? (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {data.recentFiles.map((file: VaultFile) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 hover:bg-muted rounded text-sm"
              >
                <span className="truncate flex-1 mr-4" title={file.path}>
                  {file.path}
                </span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {formatBytes(file.size)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">暂无文件</div>
        )}
      </div>
    );
  };

  // 内容区域
  const renderContent = () => {
    if (!data) return null;
    return (
      <div className="space-y-6">
        {renderBasicInfo()}
        <Separator />
        {renderUserInfo()}
        <Separator />
        {renderStats()}
        <Separator />
        {renderDevices()}
        <Separator />
        {renderRecentFiles()}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon={FolderOpenIcon} className="h-5 w-5" />
            Vault 详情
          </DialogTitle>
        </DialogHeader>

        {isLoading ? renderLoading() : renderContent()}

        <DialogFooter>
          {onDelete && (
            <Button variant="destructive" onClick={onDelete}>
              删除 Vault
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
