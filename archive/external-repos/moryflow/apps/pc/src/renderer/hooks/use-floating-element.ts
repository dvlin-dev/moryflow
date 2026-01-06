"use client"

import type {
  AutoUpdateOptions,
  UseDismissProps,
  UseFloatingOptions,
} from "@floating-ui/react"
import {
  autoUpdate,
  useDismiss,
  useFloating,
  useInteractions,
  useTransitionStyles,
} from "@floating-ui/react"
import { useEffect, useMemo } from "react"

interface FloatingElementReturn {
  /**
   * Whether the floating element is currently mounted in the DOM.
   */
  isMounted: boolean
  /**
   * Ref function to attach to the floating element DOM node.
   */
  ref: (node: HTMLElement | null) => void
  /**
   * Combined styles for positioning, transitions, and z-index.
   */
  style: React.CSSProperties
  /**
   * Returns props that should be spread onto the floating element.
   */
  getFloatingProps: (
    userProps?: React.HTMLProps<HTMLElement>
  ) => Record<string, unknown>
  /**
   * Returns props that should be spread onto the reference element.
   */
  getReferenceProps: (
    userProps?: React.HTMLProps<Element>
  ) => Record<string, unknown>
}

/**
 * Custom hook for creating and managing floating elements relative to a reference position
 *
 * @param show - Boolean controlling visibility of the floating element
 * @param referencePos - DOMRect, function returning DOMRect, or null representing the position to anchor the floating element to
 * @param zIndex - Z-index value for the floating element
 * @param options - Additional options to pass to the underlying useFloating hook
 * @returns Object containing properties and methods to control the floating element
 */
export function useFloatingElement(
  show: boolean,
  reference: HTMLElement | DOMRect | (() => DOMRect | null) | null,
  zIndex: number,
  options?: Partial<UseFloatingOptions & { dismissOptions?: UseDismissProps }>,
  autoUpdateOptions?: AutoUpdateOptions
): FloatingElementReturn {
  const { dismissOptions, ...floatingOptions } = options || {}

  const { refs, context, floatingStyles } = useFloating({
    open: show,
    whileElementsMounted(referenceEl, floatingEl, update) {
      const cleanup = autoUpdate(
        referenceEl,
        floatingEl,
        update,
        autoUpdateOptions
      )
      return cleanup
    },
    ...floatingOptions,
  })

  const { isMounted, styles } = useTransitionStyles(context)

  const dismiss = useDismiss(context, dismissOptions)

  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss])

  useEffect(() => {
    if (reference === null) {
      refs.setReference(null)
      return
    }

    // If reference is an actual DOM element, use it directly
    // autoUpdate will automatically observe it for scroll/resize
    if (reference instanceof HTMLElement) {
      refs.setReference(reference)

      return
    }

    const getBoundingClientRect = () => {
      const rect = typeof reference === "function" ? reference() : reference
      return rect || new DOMRect()
    }

    refs.setReference({
      getBoundingClientRect,
    })
  }, [reference, refs])

  return useMemo(
    () => ({
      isMounted,
      ref: refs.setFloating,
      style: {
        ...styles,
        ...floatingStyles,
        zIndex,
      },
      getFloatingProps,
      getReferenceProps,
    }),
    [
      floatingStyles,
      isMounted,
      refs.setFloating,
      styles,
      zIndex,
      getFloatingProps,
      getReferenceProps,
    ]
  )
}
