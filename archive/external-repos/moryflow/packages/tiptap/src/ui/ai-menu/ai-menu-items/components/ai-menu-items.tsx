"use client";

import { Fragment, useCallback, useMemo } from "react";

import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor";
import {
  type Action,
  filterMenuGroups,
  filterMenuItems,
  MenuGroup,
  MenuGroupLabel,
  useComboboxValueState,
} from "../../../../ui-primitive/menu";
import { Separator } from "../../../../ui-primitive/separator";

import type { MenuActionIdentifier } from "../ai-menu-items-types";
import {
  initializeEditorMenuActions,
  isNestedMenuItem,
  mapInteractionContextToActions,
} from "../handle";
import type { AiMenuItemsProps } from "../const";
import { MenuActionRenderer } from "./menu-action-renderer";

export function AiMenuItems({ editor: providedEditor }: AiMenuItemsProps) {
  const { editor } = useTiptapEditor(providedEditor);
  const [searchValue] = useComboboxValueState();

  const availableMenuActions = useMemo(
    () => initializeEditorMenuActions(),
    []
  );
  const contextualActionGroups = useMemo(
    () => mapInteractionContextToActions(availableMenuActions),
    [availableMenuActions]
  );

  const filteredActionGroups = useMemo(() => {
    return (
      filterMenuGroups(contextualActionGroups, searchValue) ||
      contextualActionGroups
    );
  }, [contextualActionGroups, searchValue]);

  const wouldActionRenderContent = useCallback(
    (menuItem: Action) => {
      if (!menuItem.value) return false;

      const editorAction =
        availableMenuActions[menuItem.value as MenuActionIdentifier];
      if (!editorAction) return false;

      if (
        isNestedMenuItem(editorAction) &&
        editorAction.filterItems &&
        searchValue.trim()
      ) {
        const nestedItems = filterMenuItems(
          { items: editorAction.items || [] },
          searchValue
        );
        return nestedItems.length > 0;
      }

      return true;
    },
    [availableMenuActions, searchValue]
  );

  if (!editor) {
    return null;
  }

  const renderableGroups = filteredActionGroups
    .map((actionGroup) => ({
      ...actionGroup,
      items: actionGroup.items?.filter(wouldActionRenderContent) ?? [],
    }))
    .filter((actionGroup) => actionGroup.items.length > 0);

  if (renderableGroups.length === 0) {
    return null;
  }

  return renderableGroups.map((actionGroup, groupIndex) => (
    <Fragment key={groupIndex}>
      <MenuGroup key={groupIndex}>
        <MenuGroupLabel>{actionGroup.label}</MenuGroupLabel>
        {actionGroup.items.map((menuItem: Action) => (
          <MenuActionRenderer
            key={menuItem.value || groupIndex}
            menuItem={menuItem}
            availableActions={availableMenuActions}
            editor={editor}
          />
        ))}
      </MenuGroup>
      {groupIndex < renderableGroups.length - 1 && (
        <Separator orientation="horizontal" />
      )}
    </Fragment>
  ));
}
