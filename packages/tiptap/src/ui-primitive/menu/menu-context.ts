"use client"

import { createContext, useContext } from "react"
import type { MenuContextValue } from "../menu/menu-types"

export const SearchableContext = createContext<boolean>(false)

export const MenuContext = createContext<MenuContextValue>({
  isRootMenu: false,
  open: false,
})

export const useSearchableContext = (): boolean => {
  return useContext(SearchableContext)
}

export const useMenuContext = (): MenuContextValue => {
  return useContext(MenuContext)
}
