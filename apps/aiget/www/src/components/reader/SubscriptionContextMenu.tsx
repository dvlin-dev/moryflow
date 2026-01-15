/**
 * [PROPS]: subscription, children
 * [POS]: Right-click context menu for subscription actions
 */

import { type ReactNode, useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Icon,
} from '@aiget/ui';
import {
  PlayIcon,
  Settings01Icon,
  Clock01Icon,
  BulbIcon,
  Share01Icon,
  PauseIcon,
  Delete01Icon,
} from '@hugeicons/core-free-icons';
import {
  useTriggerManualRun,
  useToggleSubscription,
  useDeleteSubscription,
} from '@/features/digest/hooks';
import type { Subscription } from '@/features/digest/types';
import type { SubscriptionAction } from './subscriptions/subscriptionActions';

interface SubscriptionContextMenuProps {
  subscription: Subscription;
  children: ReactNode;
  /** Open modal/drawer inside Reader for a specific action */
  onAction?: (action: SubscriptionAction, subscription: Subscription) => void;
}

export function SubscriptionContextMenu({
  subscription,
  children,
  onAction,
}: SubscriptionContextMenuProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const triggerRun = useTriggerManualRun();
  const toggleSubscription = useToggleSubscription();
  const deleteSubscription = useDeleteSubscription();

  const handleRunNow = () => {
    triggerRun.mutate(subscription.id);
  };

  const handleToggle = () => {
    toggleSubscription.mutate(subscription.id);
  };

  const handleDelete = () => {
    deleteSubscription.mutate(subscription.id);
    setShowDeleteAlert(false);
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={handleRunNow} disabled={triggerRun.isPending}>
            <Icon icon={PlayIcon} className="mr-2 size-4" />
            <span>Run Now</span>
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem
            onClick={() => onAction?.('settings', subscription)}
            disabled={!onAction}
          >
            <Icon icon={Settings01Icon} className="mr-2 size-4" />
            <span>Settings</span>
          </ContextMenuItem>

          <ContextMenuItem onClick={() => onAction?.('history', subscription)} disabled={!onAction}>
            <Icon icon={Clock01Icon} className="mr-2 size-4" />
            <span>Run History</span>
          </ContextMenuItem>

          <ContextMenuItem
            onClick={() => onAction?.('suggestions', subscription)}
            disabled={!onAction}
          >
            <Icon icon={BulbIcon} className="mr-2 size-4" />
            <span>Learning Suggestions</span>
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem onClick={() => onAction?.('publish', subscription)} disabled={!onAction}>
            <Icon icon={Share01Icon} className="mr-2 size-4" />
            <span>Publish as Topic</span>
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem onClick={handleToggle} disabled={toggleSubscription.isPending}>
            <Icon icon={PauseIcon} className="mr-2 size-4" />
            <span>{subscription.enabled ? 'Pause Subscription' : 'Enable Subscription'}</span>
          </ContextMenuItem>

          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setShowDeleteAlert(true)}
          >
            <Icon icon={Delete01Icon} className="mr-2 size-4" />
            <span>Delete</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subscription "{subscription.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              All related data will be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
