'use client'

import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import SearchDialog from './search-dialog'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{
        SearchDialog,
      }}
    >
      {children}
    </RootProvider>
  )
}
