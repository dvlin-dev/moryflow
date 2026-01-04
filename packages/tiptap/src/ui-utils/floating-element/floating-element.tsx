"use client"

import type { HTMLAttributes } from "react"
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { type Editor } from "@tiptap/react"
import {
  flip,
  offset,
  shift,
  useMergeRefs,
  type UseFloatingOptions,
} from "@floating-ui/react"
import { Selection } from "@tiptap/pm/state"

// --- Hooks ---
import { useTiptapEditor } from "../../hooks/use-tiptap-editor"
import { useFloatingElement } from "../../hooks/use-floating-element"

// --- Lib ---
import {
  getSelectionBoundingRect,
  isSelectionValid,
} from "../../utils/tiptap-collab-utils"

import { isElementWithinEditor } from "./floating-element-utils"
import { isValidPosition } from "../../utils/tiptap-utils"

export interface FloatingElementProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The Tiptap editor instance to attach to.
   */
  editor?: Editor | null
  /**
   * Controls whether the floating element should be visible.
   * @default undefined
   */
  shouldShow?: boolean
  /**
   * Additional options to pass to the floating UI.
   */
  floatingOptions?: Partial<UseFloatingOptions>
  /**
   * Z-index for the floating element.
   * @default 50
   */
  zIndex?: number
  /**
   * Callback fired when the visibility state changes.
   */
  onOpenChange?: (open: boolean) => void
  /**
   * Reference element to position the floating element relative to.
   * If provided, this takes precedence over getBoundingClientRect.
   */
  referenceElement?: HTMLElement | null
  /**
   * Custom function to determine the position of the floating element.
   * Only used if referenceElement is not provided.
   * @default getSelectionBoundingRect
   */
  getBoundingClientRect?: (editor: Editor) => DOMRect | null
  /**
   * Whether to close the floating element when Escape key is pressed.
   * @default true
   */
  closeOnEscape?: boolean
}

/**
 * A floating UI element that positions itself relative to the current selection in a Tiptap editor.
 * Used for floating toolbars, menus, and other UI elements that need to appear near the text cursor.
 */
export const FloatingElement = forwardRef<HTMLDivElement, FloatingElementProps>(
  (
    {
      editor: providedEditor,
      shouldShow = undefined,
      floatingOptions,
      zIndex = 50,
      onOpenChange,
      referenceElement,
      getBoundingClientRect = getSelectionBoundingRect,
      closeOnEscape = true,
      children,
      style: propStyle,
      ...props
    },
    forwardedRef
  ) => {
    const [open, setOpen] = useState<boolean>(
      shouldShow !== undefined ? shouldShow : false
    )

    const floatingElementRef = useRef<HTMLDivElement | null>(null)
    const preventHideRef = useRef(false)
    const preventShowRef = useRef(false)
    const editorRef = useRef<Editor | null>(null)
    const getBoundingClientRectRef = useRef(getBoundingClientRect)

    const { editor } = useTiptapEditor(providedEditor)

    // Keep refs up to date
    useEffect(() => {
      editorRef.current = editor
      getBoundingClientRectRef.current = getBoundingClientRect
    }, [editor, getBoundingClientRect])

    const handleOpenChange = useCallback(
      (newOpen: boolean) => {
        onOpenChange?.(newOpen)
        setOpen(newOpen)
      },
      [onOpenChange]
    )

    const handleFloatingOpenChange = (open: boolean) => {
      if (!open && editor) {
        // When the floating element closes, reset the selection.
        // This lets the user place the cursor again and ensures the drag handle reappears,
        // as it's intentionally hidden during valid text selections.
        const tr = editor.state.tr.setSelection(
          Selection.near(editor.state.doc.resolve(0))
        )
        editor.view.dispatch(tr)
      }

      handleOpenChange(open)
    }

    // Use referenceElement if provided, otherwise create dynamic rect function
    const reference = useMemo(() => {
      if (referenceElement) {
        return referenceElement
      }

      return () => {
        if (!editorRef.current) return null
        return getBoundingClientRectRef.current(editorRef.current)
      }
    }, [referenceElement])

    const { isMounted, ref, style, getFloatingProps } = useFloatingElement(
      open,
      reference,
      zIndex,
      {
        placement: "top",
        middleware: [shift(), flip(), offset(4)],
        onOpenChange: handleFloatingOpenChange,
        dismissOptions: {
          enabled: true,
          escapeKey: true,
          outsidePress(event) {
            const relatedTarget = event.target as Node
            if (!relatedTarget) return false

            return !isElementWithinEditor(editor, relatedTarget)
          },
        },
        ...floatingOptions,
      }
    )

    const updateSelectionState = useCallback(() => {
      if (!editor) return

      const newRect = getBoundingClientRect(editor)

      if (newRect && shouldShow !== undefined && !preventShowRef.current) {
        handleOpenChange(shouldShow)
        return
      }

      const shouldShowResult = isSelectionValid(editor)

      if (
        newRect &&
        !preventShowRef.current &&
        (shouldShowResult || preventHideRef.current)
      ) {
        handleOpenChange(true)
      } else if (
        !preventHideRef.current &&
        (!shouldShowResult || preventShowRef.current || !editor.isEditable)
      ) {
        handleOpenChange(false)
      }
    }, [editor, getBoundingClientRect, handleOpenChange, shouldShow])

    useEffect(() => {
      if (!editor || !closeOnEscape) return

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && open) {
          handleOpenChange(false)
          return true
        }
        return false
      }

      editor.view.dom.addEventListener("keydown", handleKeyDown)
      return () => {
        editor.view.dom.removeEventListener("keydown", handleKeyDown)
      }
    }, [editor, open, closeOnEscape, handleOpenChange])

    useEffect(() => {
      if (!editor) return

      const handleBlur = (event: FocusEvent) => {
        if (preventHideRef.current) {
          preventHideRef.current = false
          return
        }

        const relatedTarget = event.relatedTarget as Node
        if (!relatedTarget) return

        const isWithinEditor = isElementWithinEditor(editor, relatedTarget)

        const floatingElement = floatingElementRef.current
        const isWithinFloatingElement =
          floatingElement &&
          (floatingElement === relatedTarget ||
            floatingElement.contains(relatedTarget))

        if (!isWithinEditor && !isWithinFloatingElement && open) {
          handleOpenChange(false)
        }
      }

      editor.view.dom.addEventListener("blur", handleBlur)
      return () => {
        editor.view.dom.removeEventListener("blur", handleBlur)
      }
    }, [editor, handleOpenChange, open])

    useEffect(() => {
      if (!editor) return

      const handleDrag = () => {
        if (open) {
          handleOpenChange(false)
        }
      }

      editor.view.dom.addEventListener("dragstart", handleDrag)
      editor.view.dom.addEventListener("dragover", handleDrag)

      return () => {
        editor.view.dom.removeEventListener("dragstart", handleDrag)
        editor.view.dom.removeEventListener("dragover", handleDrag)
      }
    }, [editor, open, handleOpenChange])

    useEffect(() => {
      if (!editor) return

      const handleMouseDown = (event: MouseEvent) => {
        if (event.button !== 0) return

        preventShowRef.current = true

        const { state, view } = editor
        const posCoords = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        })

        if (!posCoords || !isValidPosition(posCoords.pos)) return

        const $pos = state.doc.resolve(posCoords.pos)
        const nodeBefore = $pos.nodeBefore

        if (!nodeBefore || nodeBefore.isBlock) return

        const tr = state.tr.setSelection(
          Selection.near(state.doc.resolve(posCoords.pos))
        )
        view.dispatch(tr)
      }

      const handleMouseUp = () => {
        if (preventShowRef.current) {
          preventShowRef.current = false
          updateSelectionState()
        }
      }

      editor.view.dom.addEventListener("mousedown", handleMouseDown)
      editor.view.root.addEventListener("mouseup", handleMouseUp)

      return () => {
        editor.view.dom.removeEventListener("mousedown", handleMouseDown)
        editor.view.root.removeEventListener("mouseup", handleMouseUp)
      }
    }, [editor, updateSelectionState])

    useEffect(() => {
      if (!editor) return

      editor.on("selectionUpdate", updateSelectionState)

      return () => {
        editor.off("selectionUpdate", updateSelectionState)
      }
    }, [editor, updateSelectionState])

    useEffect(() => {
      if (!editor) return
      updateSelectionState()
    }, [editor, updateSelectionState])

    const finalStyle = useMemo(
      () =>
        propStyle && Object.keys(propStyle).length > 0 ? propStyle : style,
      [propStyle, style]
    )
    const mergedRef = useMergeRefs([ref, forwardedRef, floatingElementRef])

    if (!editor || !isMounted || !open) return null

    return (
      <div
        ref={mergedRef}
        style={finalStyle}
        {...props}
        {...getFloatingProps()}
      >
        {children}
      </div>
    )
  }
)

FloatingElement.displayName = "FloatingElement"
