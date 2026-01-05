"use client";

import type { TextOptions } from "../../../ai-types";
import type { Editor } from "@tiptap/react";

import { useAiMenuState } from "../../ai-menu-hooks";
import { Button } from "../../../../ui-primitive/button";
import { MenuItem } from "../../../../ui-primitive/menu";

import type { MenuActionRendererProps } from "../ai-menu-items-types";
import { isExecutableMenuItem, isNestedMenuItem } from "../handle";
import type {
  EditorMenuAction,
  MenuActionIdentifier,
} from "../ai-menu-items-types";

type MenuActionsMap = Record<MenuActionIdentifier, EditorMenuAction>;

export function MenuActionRenderer({
  menuItem,
  availableActions,
  editor,
}: MenuActionRendererProps & {
  availableActions: MenuActionsMap;
  editor: Editor | null;
}) {
  const { state } = useAiMenuState();

  if (!menuItem.value) {
    return null;
  }

  const editorAction = availableActions[menuItem.value as MenuActionIdentifier];
  if (!editorAction) {
    return null;
  }

  if (isNestedMenuItem(editorAction)) {
    const SubmenuComponent = editorAction.component;
    return <SubmenuComponent key={menuItem.value} editor={editor} />;
  }

  if (isExecutableMenuItem(editorAction)) {
    const options: TextOptions = {
      stream: true,
      format: "rich-text",
      language: state.language,
    };

    if (state.tone) {
      options.tone = state.tone;
    }

    return (
      <MenuItem
        key={menuItem.value}
        onClick={() =>
          editorAction.onSelect({
            editor,
            options,
          })
        }
        render={
          <Button data-style="ghost">
            {editorAction.icon}
            <span className="tiptap-button-text">{editorAction.label}</span>
          </Button>
        }
      />
    );
  }

  return null;
}
