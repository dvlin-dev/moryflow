import { useCallback, useEffect, useMemo } from "react"
import * as Ariakit from "@ariakit/react"
import type {
  ContextMenuAnchor,
  UseContextMenuReturn,
  UseMenuStoreReturn,
} from "../menu/menu-types"

export function useComboboxValueState(): readonly [
  string,
  (value: string) => void,
] {
  const store = Ariakit.useComboboxContext()
  const searchValue = Ariakit.useStoreState(store, "value") ?? ""

  if (!store) {
    throw new Error(
      "useComboboxValueState must be used within ComboboxProvider"
    )
  }

  return [searchValue, store.setValue] as const
}

export function useMenuPlacement(): string {
  const store = Ariakit.useMenuStore()
  const currentPlacement = Ariakit.useStoreState(
    store,
    (state) => state.currentPlacement?.split("-")[0] || "bottom"
  )
  return currentPlacement
}

export function useContextMenu(
  anchorRect: ContextMenuAnchor
): UseContextMenuReturn {
  const menu = Ariakit.useMenuStore()

  useEffect(() => {
    if (anchorRect) {
      menu.render()
    }
  }, [anchorRect, menu])

  const getAnchorRect = useCallback(() => anchorRect, [anchorRect])

  const show = useCallback(() => {
    menu.show()
    menu.setAutoFocusOnShow(true)
  }, [menu])

  return useMemo(
    () => ({
      store: menu,
      getAnchorRect,
      show,
    }),
    [menu, getAnchorRect, show]
  )
}

export function useFloatingMenuStore(): UseMenuStoreReturn {
  const menu = Ariakit.useMenuStore()

  const show = useCallback(
    (anchorElement: HTMLElement) => {
      menu.setAnchorElement(anchorElement)
      menu.show()
      menu.setAutoFocusOnShow(true)
    },
    [menu]
  )

  return useMemo(
    () => ({
      store: menu,
      show,
    }),
    [menu, show]
  )
}

export function useMenuItemClick(
  menu?: Ariakit.MenuStore,
  preventClose?: boolean
) {
  return useCallback(
    (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
      const expandable = event.currentTarget.hasAttribute("aria-expanded")

      if (expandable || preventClose) {
        return false
      }

      menu?.hideAll()
      return false
    },
    [menu, preventClose]
  )
}
