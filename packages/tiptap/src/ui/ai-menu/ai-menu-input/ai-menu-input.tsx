import { useCallback, useState } from "react"

// Tiptap Core Extensions
import type { Tone } from "../../ai-types"

// Icons
import { MicAiIcon } from "@anyhunt/ui/icons/mic-ai-icon"
import { ArrowUpIcon } from "@anyhunt/ui/icons/arrow-up-icon"
import { AiSparklesIcon } from "@anyhunt/ui/icons/ai-sparkles-icon"

// UI Components
import { SUPPORTED_TONES } from "../ai-menu-items/ai-menu-items-constants"

// UI Primitives
import { Button, ButtonGroup } from "../../../ui-primitive/button"
import { Spacer } from "../../../ui-primitive/spacer"
import { Toolbar, ToolbarGroup } from "../../../ui-primitive/toolbar"
import { useComboboxValueState } from "../../../ui-primitive/menu"
import { Combobox } from "../../../ui-primitive/combobox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../ui-primitive/dropdown-menu"
import { TextareaAutosize } from "../../../ui-primitive/textarea-autosize"
import { Card, CardBody } from "../../../ui-primitive/card"

import {
  useBlurHandler,
  useKeyboardHandlers,
} from "./ai-menu-input-hooks"
import type { AiMenuInputTextareaProps } from "./ai-menu-input-types"

// Styles
import "./ai-menu-input.scss"

export function AiMenuInputPlaceholder({
  onPlaceholderClick,
}: {
  onPlaceholderClick: () => void
}) {
  return (
    <div
      className="tiptap-ai-prompt-input-placeholder"
      onClick={onPlaceholderClick}
    >
      <div className="tiptap-ai-prompt-input-placeholder-content">
        <AiSparklesIcon className="tiptap-ai-prompt-input-placeholder-icon" />
        <span className="tiptap-ai-prompt-input-placeholder-text">
          Tell AI what else needs to be changed...
        </span>
      </div>
      <Button data-style="primary" disabled>
        <ArrowUpIcon className="tiptap-button-icon" />
      </Button>
    </div>
  )
}

export function ToneSelector({
  tone,
  onToneChange,
}: {
  tone: Tone | null
  onToneChange: (tone: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          data-style="ghost"
          data-active-state={tone ? "on" : "off"}
          role="button"
          tabIndex={-1}
          aria-label="Tone adjustment options"
        >
          <MicAiIcon className="tiptap-button-icon" />
          <span className="tiptap-button-text">Tone</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <Card>
          <CardBody>
            <ButtonGroup>
              {SUPPORTED_TONES.map((supportedTone) => (
                <DropdownMenuItem key={supportedTone.value} asChild>
                  <Button
                    data-style="ghost"
                    data-active-state={
                      tone === supportedTone.value ? "on" : "off"
                    }
                    onClick={() => onToneChange(supportedTone.value)}
                  >
                    <span className="tiptap-button-text">
                      {supportedTone.label}
                    </span>
                  </Button>
                </DropdownMenuItem>
              ))}
            </ButtonGroup>
          </CardBody>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AiPromptInputToolbar({
  showPlaceholder,
  onInputSubmit,
  onToneChange,
  isEmpty = false,
}: {
  showPlaceholder?: boolean
  onInputSubmit: (prompt: string) => void
  onToneChange?: (tone: string) => void
  isEmpty?: boolean
}) {
  const [tone, setTone] = useState<Tone | null>(null)
  const [promptValue] = useComboboxValueState()

  const handleToneChange = useCallback(
    (newTone: string) => {
      setTone(newTone)
      onToneChange?.(newTone)
    },
    [onToneChange]
  )

  const handleSubmit = useCallback(() => {
    onInputSubmit(promptValue)
  }, [onInputSubmit, promptValue])

  return (
    <Toolbar
      variant="floating"
      data-plain="true"
      className="tiptap-ai-prompt-input-toolbar"
      style={{ display: showPlaceholder ? "none" : "flex" }}
    >
      <ToolbarGroup>
        <ToneSelector tone={tone} onToneChange={handleToneChange} />
      </ToolbarGroup>

      <Spacer />

      <ToolbarGroup>
        <Button
          onClick={handleSubmit}
          disabled={isEmpty}
          data-style="primary"
          aria-label="Submit prompt"
        >
          <ArrowUpIcon className="tiptap-button-icon" />
        </Button>
      </ToolbarGroup>
    </Toolbar>
  )
}

export function AiMenuInputTextarea({
  onInputSubmit,
  onToneChange,
  onClose,
  onInputFocus,
  onInputBlur,
  onEmptyBlur,
  onPlaceholderClick,
  showPlaceholder = false,
  placeholder = "Ask AI what you want...",
  ...props
}: AiMenuInputTextareaProps) {
  const [promptValue, setPromptValue] = useComboboxValueState()
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = useCallback(() => {
    const cleanedPrompt = promptValue?.trim()
    if (cleanedPrompt) {
      onInputSubmit(cleanedPrompt)
      setPromptValue("")
    }
  }, [onInputSubmit, promptValue, setPromptValue])

  const handleKeyDown = useKeyboardHandlers(promptValue, onClose, handleSubmit)

  const handleBlur = useBlurHandler(
    promptValue.trim() === "",
    onInputBlur,
    onEmptyBlur
  )

  const handleOnPlaceholderClick = useCallback(() => {
    if (onPlaceholderClick) {
      onPlaceholderClick()
    }
  }, [onPlaceholderClick])

  const handleFocus = useCallback(() => {
    setIsFocused(true)
    if (onInputFocus) {
      onInputFocus()
    }
  }, [onInputFocus])

  const handleTextareaBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false)
      handleBlur(e)
    },
    [handleBlur]
  )

  return (
    <div
      className="tiptap-ai-prompt-input"
      data-focused={isFocused}
      data-active-state={showPlaceholder ? "off" : "on"}
      {...props}
    >
      {showPlaceholder ? (
        <AiMenuInputPlaceholder onPlaceholderClick={handleOnPlaceholderClick} />
      ) : (
        <>
          <Combobox
            autoSelect="always"
            autoFocus
            render={
              <TextareaAutosize
                onChange={(e) => setPromptValue(e.target.value)}
                value={promptValue}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleTextareaBlur}
                className="tiptap-ai-prompt-input-content"
                placeholder={placeholder}
                autoFocus
                style={{
                  display: showPlaceholder ? "none" : "flex",
                }}
              />
            }
          />

          <AiPromptInputToolbar
            showPlaceholder={showPlaceholder}
            onInputSubmit={handleSubmit}
            onToneChange={onToneChange}
            isEmpty={!promptValue?.trim()}
          />
        </>
      )}
    </div>
  )
}
