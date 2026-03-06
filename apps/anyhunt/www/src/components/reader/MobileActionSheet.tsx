/**
 * [PROPS]: subscription, open, onOpenChange, callbacks
 * [POS]: Mobile action sheet for subscription actions (bottom drawer, Lucide icons direct render)
 */

import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  cn,
} from '@moryflow/ui';
import {
  Play,
  Settings,
  Clock,
  Lightbulb,
  Share,
  Pause,
  Delete,
  type LucideIcon,
} from 'lucide-react';
import {
  useTriggerManualRun,
  useToggleSubscription,
  useDeleteSubscription,
} from '@/features/digest/hooks';
import type { Subscription } from '@/features/digest/types';
import type { SubscriptionAction } from './subscriptions/subscriptionActions';

interface ActionItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

function ActionItem({
  icon: IconComponent,
  label,
  onClick,
  destructive,
  disabled,
}: ActionItemProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors',
        'active:bg-accent',
        destructive ? 'text-destructive' : 'text-foreground',
        disabled && 'opacity-50'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <IconComponent className="size-5" />
      <span className="text-base">{label}</span>
    </button>
  );
}

function Divider() {
  return <div className="mx-4 border-t border-border" />;
}

interface MobileActionSheetProps {
  subscription: Subscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Open modal/drawer inside Reader for a specific action */
  onAction?: (action: SubscriptionAction, subscription: Subscription) => void;
}

/**
 * Mobile action sheet for subscription operations
 *
 * Displayed as a bottom drawer, triggered by long press on mobile
 */
export function MobileActionSheet({
  subscription,
  open,
  onOpenChange,
  onAction,
}: MobileActionSheetProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const triggerRun = useTriggerManualRun();
  const toggleSubscription = useToggleSubscription();
  const deleteSubscription = useDeleteSubscription();

  const closeSheet = () => onOpenChange(false);

  const handleRunNow = () => {
    triggerRun.mutate(subscription.id);
    closeSheet();
  };

  const handleSettings = () => {
    closeSheet();
    onAction?.('settings', subscription);
  };

  const handleHistory = () => {
    closeSheet();
    onAction?.('history', subscription);
  };

  const handleSuggestions = () => {
    closeSheet();
    onAction?.('suggestions', subscription);
  };

  const handlePublish = () => {
    closeSheet();
    onAction?.('publish', subscription);
  };

  const handleToggle = () => {
    toggleSubscription.mutate(subscription.id);
    closeSheet();
  };

  const handleDelete = () => {
    deleteSubscription.mutate(subscription.id);
    setShowDeleteAlert(false);
    closeSheet();
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-center">{subscription.name}</DrawerTitle>
          </DrawerHeader>
          <div className="pb-6">
            <ActionItem
              icon={Play}
              label="Run Now"
              onClick={handleRunNow}
              disabled={triggerRun.isPending}
            />

            <Divider />

            <ActionItem icon={Settings} label="Settings" onClick={handleSettings} />
            <ActionItem icon={Clock} label="Run History" onClick={handleHistory} />
            <ActionItem icon={Lightbulb} label="Learning Suggestions" onClick={handleSuggestions} />

            <Divider />

            <ActionItem icon={Share} label="Publish as Topic" onClick={handlePublish} />

            <Divider />

            <ActionItem
              icon={Pause}
              label={subscription.enabled ? 'Pause Subscription' : 'Enable Subscription'}
              onClick={handleToggle}
              disabled={toggleSubscription.isPending}
            />
            <ActionItem
              icon={Delete}
              label="Delete"
              onClick={() => {
                closeSheet();
                setShowDeleteAlert(true);
              }}
              destructive
            />
          </div>
        </DrawerContent>
      </Drawer>

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
