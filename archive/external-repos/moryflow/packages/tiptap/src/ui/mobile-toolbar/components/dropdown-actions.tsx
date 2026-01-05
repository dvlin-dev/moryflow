"use client"

import { ButtonGroup } from "../../../ui-primitive/button"
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardItemGroup,
} from "../../../ui-primitive/card"
import { Separator } from "../../../ui-primitive/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../ui-primitive/dropdown-menu"
import { Button } from "../../../ui-primitive/button"
import { MoreVerticalIcon } from "@moryflow/ui/icons/more-vertical-icon"
import { useIsBreakpoint } from "../../../hooks/use-is-breakpoint"
import { getNodeDisplayName } from "../../../utils/tiptap-collab-utils"
import { ResetAllFormattingButton } from "../../reset-all-formatting-button"
import { DuplicateButton } from "../../duplicate-button"
import { CopyToClipboardButton } from "../../copy-to-clipboard-button"
import { CopyAnchorLinkButton } from "../../copy-anchor-link-button"
import { AiAskButton } from "../../ai-ask-button"
import { DeleteNodeButton } from "../../delete-node-button"

import type { DropdownMenuActionsProps } from "../types"
import { ColorActionGroup, TransformActionGroup } from "./groups"

/**
 * 下拉菜单内容
 */
export function DropdownMenuActions({ editor }: DropdownMenuActionsProps) {
  const isMobile = useIsBreakpoint()

  return (
    <Card>
      <CardBody>
        <CardItemGroup>
          <CardGroupLabel>{getNodeDisplayName(editor)}</CardGroupLabel>
          <ButtonGroup>
            <ColorActionGroup />
            <TransformActionGroup />

            <DropdownMenuItem asChild>
              <ResetAllFormattingButton text="Reset formatting" />
            </DropdownMenuItem>
          </ButtonGroup>
        </CardItemGroup>

        <Separator orientation="horizontal" />

        <ButtonGroup>
          <DropdownMenuItem asChild>
            <DuplicateButton text="Duplicate node" showShortcut={!isMobile} />
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <CopyToClipboardButton
              text="Copy to clipboard"
              showShortcut={!isMobile}
            />
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <CopyAnchorLinkButton
              text="Copy anchor link"
              showShortcut={!isMobile}
            />
          </DropdownMenuItem>
        </ButtonGroup>

        <Separator orientation="horizontal" />

        <ButtonGroup>
          <DropdownMenuItem asChild>
            <AiAskButton text="Ask AI" showShortcut={!isMobile} />
          </DropdownMenuItem>
        </ButtonGroup>

        <Separator orientation="horizontal" />

        <ButtonGroup>
          <DropdownMenuItem asChild>
            <DeleteNodeButton text="Delete" showShortcut={!isMobile} />
          </DropdownMenuItem>
        </ButtonGroup>
      </CardBody>
    </Card>
  )
}

/**
 * 更多操作下拉菜单
 */
export function MoreActionsDropdown({ editor }: DropdownMenuActionsProps) {
  return (
    <DropdownMenu modal>
      <DropdownMenuTrigger asChild>
        <Button data-style="ghost" data-appearance="subdued">
          <MoreVerticalIcon className="tiptap-button-icon" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent portal>
        <DropdownMenuActions editor={editor} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
