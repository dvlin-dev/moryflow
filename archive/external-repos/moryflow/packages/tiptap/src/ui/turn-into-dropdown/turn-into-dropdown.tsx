"use client"

import { forwardRef } from "react"

// --- Tiptap UI ---
import type { UseTurnIntoDropdownConfig } from "./use-turn-into-dropdown"
import {
  useTurnIntoDropdown,
  getFilteredBlockTypeOptions,
} from "./use-turn-into-dropdown"

// --- Hooks ---
import { useTiptapEditor } from "../../hooks/use-tiptap-editor"

// --- Tiptap UI Components ---
import { TextButton } from "../text-button"
import { HeadingButton } from "../heading-button"
import { ListButton } from "../list-button"
import { BlockquoteButton } from "../blockquote-button"
import { CodeBlockButton } from "../code-block-button"

// --- UI Primitives ---
import type { ButtonProps } from "../../ui-primitive/button"
import { Button, ButtonGroup } from "../../ui-primitive/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../ui-primitive/dropdown-menu"
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardItemGroup,
} from "../../ui-primitive/card"

export interface TurnIntoDropdownContentProps {
  blockTypes?: string[]
  useCardLayout?: boolean
}

export const TurnIntoDropdownContent: React.FC<
  TurnIntoDropdownContentProps
> = ({ blockTypes, useCardLayout = true }) => {
  const filteredOptions = getFilteredBlockTypeOptions(blockTypes)

  const renderButtons = () => (
    <ButtonGroup>
      {filteredOptions.map((option, index) =>
        renderBlockTypeButton(option, `${option.type}-${option.level ?? index}`)
      )}
    </ButtonGroup>
  )

  if (!useCardLayout) return renderButtons()

  return (
    <Card>
      <CardBody>
        <CardItemGroup>
          <CardGroupLabel>Turn into</CardGroupLabel>
          {renderButtons()}
        </CardItemGroup>
      </CardBody>
    </Card>
  )
}

function renderBlockTypeButton(
  option: ReturnType<typeof getFilteredBlockTypeOptions>[0],
  key: string
) {
  switch (option.type) {
    case "paragraph":
      return (
        <DropdownMenuItem key={key} asChild>
          <TextButton showTooltip={false} text={option.label} />
        </DropdownMenuItem>
      )

    case "heading":
      if (!option.level) {
        return null
      }

      return (
        <DropdownMenuItem key={key} asChild>
          <HeadingButton
            level={option.level || 1}
            showTooltip={false}
            text={option.label}
          />
        </DropdownMenuItem>
      )

    case "bulletList":
      return (
        <DropdownMenuItem key={key} asChild>
          <ListButton
            type="bulletList"
            showTooltip={false}
            text={option.label}
          />
        </DropdownMenuItem>
      )

    case "orderedList":
      return (
        <DropdownMenuItem key={key} asChild>
          <ListButton
            type="orderedList"
            showTooltip={false}
            text={option.label}
          />
        </DropdownMenuItem>
      )

    case "taskList":
      return (
        <DropdownMenuItem key={key} asChild>
          <ListButton type="taskList" showTooltip={false} text={option.label} />
        </DropdownMenuItem>
      )

    case "blockquote":
      return (
        <DropdownMenuItem key={key} asChild>
          <BlockquoteButton showTooltip={false} text={option.label} />
        </DropdownMenuItem>
      )

    case "codeBlock":
      return (
        <DropdownMenuItem key={key} asChild>
          <CodeBlockButton showTooltip={false} text={option.label} />
        </DropdownMenuItem>
      )

    default:
      return null
  }
}

export interface TurnIntoDropdownProps
  extends Omit<ButtonProps, "type">,
    UseTurnIntoDropdownConfig {
  /**
   * Whether to use card layout for the dropdown content
   * @default true
   */
  useCardLayout?: boolean
}

/**
 * Dropdown component for transforming block types in a Tiptap editor.
 * For custom dropdown implementations, use the `useTurnIntoDropdown` hook instead.
 */
export const TurnIntoDropdown = forwardRef<
  HTMLButtonElement,
  TurnIntoDropdownProps
>(
  (
    {
      editor: providedEditor,
      hideWhenUnavailable = false,
      blockTypes,
      useCardLayout = true,
      onOpenChange,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const {
      isVisible,
      canToggle,
      isOpen,
      activeBlockType,
      handleOpenChange,
      label,
      Icon,
    } = useTurnIntoDropdown({
      editor,
      hideWhenUnavailable,
      blockTypes,
      onOpenChange,
    })

    if (!isVisible) {
      return null
    }

    return (
      <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            data-style="ghost"
            disabled={!canToggle}
            data-disabled={!canToggle}
            role="button"
            tabIndex={-1}
            aria-label={label}
            tooltip="Turn into"
            {...buttonProps}
            ref={ref}
          >
            {children ?? (
              <>
                <span className="tiptap-button-text">
                  {activeBlockType?.label || "Text"}
                </span>
                <Icon className="tiptap-button-dropdown-small" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start">
          <TurnIntoDropdownContent
            blockTypes={blockTypes}
            useCardLayout={useCardLayout}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)

TurnIntoDropdown.displayName = "TurnIntoDropdown"
