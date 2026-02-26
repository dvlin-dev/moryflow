/**
 * [PROPS]: viewModel/actions（队列状态 + 操作回调）
 * [EMITS]: onStatusChange/onTogglePause/onRetry/onCleanCompleted
 * [POS]: 队列详情面板（操作栏 + 状态 tabs + 任务列表）
 */

import type { ReactNode } from 'react';
import {
  CircleCheck,
  CircleX,
  Clock,
  Delete,
  Loader,
  Pause,
  Play,
  RotateCcw,
  Timer,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@moryflow/ui';
import { QUEUE_LABELS, QUEUE_STATUS_TABS } from '../constants';
import type { QueueJobStatus, QueueName, QueueStats } from '../types';
import { QueueJobListContent } from './QueueJobListContent';

const statusIcons: Record<QueueJobStatus, ReactNode> = {
  waiting: <Clock className="h-4 w-4" />,
  active: <Loader className="h-4 w-4" />,
  completed: <CircleCheck className="h-4 w-4" />,
  failed: <CircleX className="h-4 w-4" />,
  delayed: <Timer className="h-4 w-4" />,
};

export interface QueueJobsPanelProps {
  viewModel: QueueJobsPanelViewModel;
  actions: QueueJobsPanelActions;
}

export interface QueueJobsPanelViewModel {
  selectedQueue: QueueName;
  selectedStatus: QueueJobStatus;
  selectedStats: QueueStats | undefined;
  isPaused: boolean;
  isRetrying: boolean;
  isCleaning: boolean;
}

export interface QueueJobsPanelActions {
  onStatusChange: (status: QueueJobStatus) => void;
  onTogglePause: () => void;
  onRetry: () => void;
  onCleanCompleted: () => void;
}

export function QueueJobsPanel({ viewModel, actions }: QueueJobsPanelProps) {
  const { selectedQueue, selectedStatus, selectedStats, isPaused, isRetrying, isCleaning } =
    viewModel;
  const { onStatusChange, onTogglePause, onRetry, onCleanCompleted } = actions;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {QUEUE_LABELS[selectedQueue]} 队列
            {isPaused ? (
              <Badge variant="outline" className="ml-2 text-yellow-600">
                已暂停
              </Badge>
            ) : null}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onTogglePause}>
              {isPaused ? (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  恢复
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  暂停
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={isRetrying || (selectedStats?.failed ?? 0) === 0}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              重试全部失败
            </Button>
            <Button variant="outline" size="sm" onClick={onCleanCompleted} disabled={isCleaning}>
              <Delete className="mr-2 h-4 w-4" />
              清理已完成
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={selectedStatus}
          onValueChange={(value) => onStatusChange(value as QueueJobStatus)}
        >
          <TabsList>
            {QUEUE_STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                {statusIcons[tab.value]}
                {tab.label}
                {selectedStats ? (
                  <Badge variant="secondary" className="ml-1">
                    {selectedStats[tab.value]}
                  </Badge>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          {QUEUE_STATUS_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <QueueJobListContent queueName={selectedQueue} status={tab.value} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
