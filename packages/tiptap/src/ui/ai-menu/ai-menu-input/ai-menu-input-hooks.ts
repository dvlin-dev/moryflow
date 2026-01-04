import { isHotkey } from "is-hotkey"
import { useCallback } from "react"

export function useKeyboardHandlers(
  promptValue: string | undefined,
  onClose?: () => void,
  onInputSubmit?: () => void
) {
  return useCallback(
    (event: React.KeyboardEvent) => {
      if (isHotkey("backspace", event) && !promptValue?.length) {
        event.preventDefault()
        onClose?.()
      } else if (isHotkey("enter", event) && !event.shiftKey) {
        event.preventDefault()
        onInputSubmit?.()
      } else if (isHotkey("escape", event)) {
        event.preventDefault()
        onClose?.()
      }
    },
    [promptValue, onClose, onInputSubmit]
  )
}

export function useBlurHandler(
  isEmpty: boolean,
  onBlur?: () => void,
  onEmptyBlur?: () => void
) {
  return useCallback(
    (e: React.FocusEvent<HTMLElement>) => {
      const hasFocus = e.currentTarget.contains(e.relatedTarget as Node)
      if (hasFocus) return

      if (isEmpty && onEmptyBlur) {
        onEmptyBlur()
      } else if (onBlur) {
        onBlur()
      }
    },
    [isEmpty, onBlur, onEmptyBlur]
  )
}
