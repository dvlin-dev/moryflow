/**
 * [PROPS]: subscription, isSelected, onSelect, callbacks
 * [POS]: Single subscription item with hover menu, context menu, and long press on mobile
 */

import { useState, type MouseEvent, useCallback } from 'react';
import { Badge, Button, Icon, cn } from '@aiget/ui';
import { MoreHorizontalIcon, RssIcon } from '@hugeicons/core-free-icons';
import { SubscriptionContextMenu } from './SubscriptionContextMenu';
import { MobileActionSheet } from './MobileActionSheet';
import { useLongPress } from '@/hooks/useLongPress';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Subscription } from '@/features/digest/types';

interface SubscriptionItemProps {
  subscription: Subscription;
  isSelected: boolean;
  onSelect: () => void;
  /** Callback to open settings dialog */
  onSettingsClick?: () => void;
  /** Callback to open run history dialog */
  onHistoryClick?: () => void;
  /** Callback to open learning suggestions dialog */
  onSuggestionsClick?: () => void;
  /** Callback to open publish topic dialog */
  onPublishClick?: () => void;
}

export function SubscriptionItem({
  subscription,
  isSelected,
  onSelect,
  onSettingsClick,
  onHistoryClick,
  onSuggestionsClick,
  onPublishClick,
}: SubscriptionItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  // Long press handler for mobile
  const handleLongPress = useCallback(() => {
    if (isMobile) {
      setMobileSheetOpen(true);
    }
  }, [isMobile]);

  const longPressHandlers = useLongPress(handleLongPress, {
    delay: 500,
  });

  // Prevent context menu on mobile (we use long press instead)
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (isMobile) {
        e.preventDefault();
      }
    },
    [isMobile]
  );

  // Merge mouse leave handlers
  const handleMouseLeave = (e: React.MouseEvent) => {
    setIsHovered(false);
    longPressHandlers.onMouseLeave(e);
  };

  const content = (
    <div
      className={cn(
        'group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors select-none',
        isSelected
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseDown={longPressHandlers.onMouseDown}
      onMouseUp={longPressHandlers.onMouseUp}
      onTouchStart={longPressHandlers.onTouchStart}
      onTouchEnd={longPressHandlers.onTouchEnd}
      onTouchMove={longPressHandlers.onTouchMove}
      onClick={onSelect}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Icon icon={RssIcon} className="size-4 shrink-0" />
        <span className="truncate">{subscription.name}</span>
        {!subscription.enabled && (
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
            Paused
          </Badge>
        )}
      </div>

      {/* More button - show on hover (desktop only) */}
      {!isMobile && (isHovered || menuOpen) && (
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            setMenuOpen(true);
          }}
        >
          <Icon icon={MoreHorizontalIcon} className="size-4" />
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: Context menu */}
      {!isMobile ? (
        <SubscriptionContextMenu
          subscription={subscription}
          onSettingsClick={onSettingsClick}
          onHistoryClick={onHistoryClick}
          onSuggestionsClick={onSuggestionsClick}
          onPublishClick={onPublishClick}
        >
          {content}
        </SubscriptionContextMenu>
      ) : (
        content
      )}

      {/* Mobile: Action sheet (bottom drawer) */}
      {isMobile && (
        <MobileActionSheet
          subscription={subscription}
          open={mobileSheetOpen}
          onOpenChange={setMobileSheetOpen}
          onSettingsClick={onSettingsClick}
          onHistoryClick={onHistoryClick}
          onSuggestionsClick={onSuggestionsClick}
          onPublishClick={onPublishClick}
        />
      )}
    </>
  );
}
