/**
 * [PROPS]: sidebar, list, detail, hasSelectedArticle, onBack
 * [POS]: Mobile three-panel swipe layout with gesture support (Lucide icons direct render)
 */

import { type ReactNode, useRef } from 'react';
import { useDrag } from '@use-gesture/react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@anyhunt/ui';
import { ChevronLeft } from 'lucide-react';

interface MobileReaderLayoutProps {
  /** Sidebar content (subscription list) */
  sidebar: ReactNode;
  /** Middle panel content (article list) */
  list: ReactNode;
  /** Detail panel content (article detail) */
  detail: ReactNode;
  /** Whether an article is selected */
  hasSelectedArticle: boolean;
  /** Callback to go back from detail view */
  onBack: () => void;
}

/**
 * Mobile reader layout with three-panel navigation and swipe gestures
 *
 * - Panel 1: Sidebar (subscription list)
 * - Panel 2: Article list
 * - Panel 3: Article detail
 *
 * Navigation flow:
 * - Tap subscription → Show article list
 * - Tap article → Show article detail
 * - Back button or swipe right → Go back
 */
export function MobileReaderLayout({
  sidebar,
  list,
  detail,
  hasSelectedArticle,
  onBack,
}: MobileReaderLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Swipe gesture handler
  const bind = useDrag(
    ({ direction: [dx], velocity: [vx], distance: [distanceX], cancel }) => {
      // Only handle horizontal swipes
      // dx > 0 means swiping right (going back)
      if (dx > 0 && hasSelectedArticle) {
        // Trigger back if swiped far enough or fast enough
        if (distanceX > 80 || (vx > 0.5 && distanceX > 30)) {
          onBack();
          cancel();
        }
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      from: () => [0, 0],
      bounds: { left: 0 },
      rubberband: true,
    }
  );

  return (
    <div
      ref={containerRef}
      className="flex h-screen w-full flex-col overflow-hidden bg-background touch-pan-y"
      {...bind()}
    >
      <AnimatePresence mode="wait">
        {hasSelectedArticle ? (
          <motion.div
            key="detail"
            className="flex h-full flex-col"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Mobile header with back button */}
            <div className="flex h-12 shrink-0 items-center border-b border-border px-2">
              <Button variant="ghost" size="icon" className="size-9" onClick={onBack}>
                <ChevronLeft className="size-5" />
              </Button>
              <span className="ml-2 text-xs text-muted-foreground">Swipe right to go back</span>
            </div>
            {/* Detail content */}
            <div className="flex-1 overflow-hidden">{detail}</div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            className="flex h-full flex-col"
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Sidebar as header area on mobile */}
            <div className="shrink-0 border-b border-border">{sidebar}</div>
            {/* List takes remaining space */}
            <div className="flex-1 overflow-hidden">{list}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
