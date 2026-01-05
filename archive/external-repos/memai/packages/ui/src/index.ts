/**
 * [PROVIDES]: primitives (52 components), composed (6 components), hooks, lib utilities
 * [DEPENDS]: React, Radix UI, Tailwind CSS, Recharts
 * [POS]: Shared UI component library - entry point for all exports
 *
 * Usage:
 *   import { cn } from '@memai/ui/lib'
 *   import { usePagination } from '@memai/ui/hooks'
 *   import { Button } from '@memai/ui/primitives'
 *   import { DataTable } from '@memai/ui/composed'
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and packages/ui/CLAUDE.md
 */

// Re-export all modules
export * from './lib';
export * from './hooks';
