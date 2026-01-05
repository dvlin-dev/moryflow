import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { type Editor } from "@tiptap/react"
import type { Transaction } from "@tiptap/pm/state"
import { getSelectedDOMElement } from "../../utils/tiptap-advanced-utils"
import {
  findPrioritizedAIElement,
  cleanupFallbackAnchors,
} from "./ai-menu-utils"
import type {
  AiMenuState,
  AiMenuStateContextValue,
  AiMenuPosition,
} from "./ai-menu-types"

export const AiMenuStateContext = createContext<AiMenuStateContextValue | null>(
  null
)

export const initialState: AiMenuState = {
  isOpen: false,
  tone: undefined,
  language: "en",
  shouldShowInput: true,
  inputIsFocused: false,
  fallbackAnchor: { element: null, rect: null },
}

export function useAiMenuState() {
  const context = useContext(AiMenuStateContext)

  if (!context) {
    throw new Error("useAiMenuState must be used within an AiMenuStateProvider")
  }

  return context
}

export function useAiMenuStateProvider() {
  const [state, setState] = useState<AiMenuState>(initialState)

  const updateState = useCallback((updates: Partial<AiMenuState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  const setFallbackAnchor = useCallback(
    (element: HTMLElement | null, rect?: DOMRect | null) => {
      const anchorRect = rect || element?.getBoundingClientRect() || null
      updateState({
        fallbackAnchor: { element, rect: anchorRect },
      })
    },
    [updateState]
  )

  const reset = useCallback(() => {
    setState(initialState)
    cleanupFallbackAnchors()
  }, [])

  const value = useMemo(
    () => ({
      state,
      updateState,
      setFallbackAnchor,
      reset,
    }),
    [state, updateState, setFallbackAnchor, reset]
  )

  return { value, AiMenuStateContext }
}

export function useAiContentTracker({
  editor,
  aiGenerationActive,
  setAnchorElement,
  fallbackAnchor,
}: {
  editor: Editor | null
  aiGenerationActive: boolean
  setAnchorElement: (element: HTMLElement) => void
  fallbackAnchor: AiMenuPosition
}) {
  const fallbackAnchorRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!editor || !aiGenerationActive) return

    const handleTransaction = ({ editor }: { editor: Editor }) => {
      const aiStorage = editor.storage.ai || editor.storage.aiAdvanced

      if (aiStorage?.state === "loading") {
        const aiMarkedElement = findPrioritizedAIElement(editor)

        if (aiMarkedElement && aiMarkedElement !== editor.view.dom) {
          if (fallbackAnchorRef.current) {
            fallbackAnchorRef.current.remove()
            fallbackAnchorRef.current = null
          }
          setAnchorElement(aiMarkedElement)
        }
      }
    }

    editor.on("transaction", handleTransaction)

    return () => {
      editor.off("transaction", handleTransaction)
      if (fallbackAnchorRef.current) {
        fallbackAnchorRef.current.remove()
        fallbackAnchorRef.current = null
      }
    }
  }, [editor, aiGenerationActive, setAnchorElement, fallbackAnchor])
}

export function useTextSelectionTracker({
  editor,
  aiGenerationActive,
  showMenuAtElement,
  setMenuVisible,
  onSelectionChange,
  prevent = false,
}: {
  editor: Editor | null
  aiGenerationActive: boolean
  showMenuAtElement: (element: HTMLElement) => void
  setMenuVisible: (visible: boolean) => void
  onSelectionChange?: (
    element: HTMLElement | null,
    rect: DOMRect | null
  ) => void
  prevent?: boolean
}) {
  useEffect(() => {
    if (!editor || !aiGenerationActive || prevent) return

    const handleTransaction = ({
      editor,
      transaction,
    }: {
      editor: Editor
      transaction: Transaction
    }) => {
      if (transaction.selection?.empty) return

      const selectedElement = getSelectedDOMElement(editor)
      const shouldShow = Boolean(selectedElement && aiGenerationActive)

      setMenuVisible(shouldShow)

      if (shouldShow && selectedElement) {
        const rect = selectedElement.getBoundingClientRect()
        onSelectionChange?.(selectedElement, rect)
        showMenuAtElement(selectedElement)
      }
    }

    editor.on("transaction", handleTransaction)
    return () => {
      editor.off("transaction", handleTransaction)
    }
  }, [
    editor,
    aiGenerationActive,
    showMenuAtElement,
    setMenuVisible,
    onSelectionChange,
    prevent,
  ])
}
