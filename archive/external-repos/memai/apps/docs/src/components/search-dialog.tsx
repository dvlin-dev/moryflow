'use client'

import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search'
import type { SortedResult } from 'fumadocs-core/search/server'
import { useCallback, useState, useTransition } from 'react'
import { useI18n } from 'fumadocs-ui/contexts/i18n'
import { searchDocs } from '../lib/search'

export default function CustomSearchDialog(props: SharedProps) {
  const { locale } = useI18n()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SortedResult[] | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      if (!value.trim()) {
        setResults(null)
        return
      }

      startTransition(async () => {
        try {
          const data = await searchDocs({ data: { query: value, locale } })
          setResults(data as SortedResult[])
        } catch {
          setResults([])
        }
      })
    },
    [locale]
  )

  return (
    <SearchDialog
      search={search}
      onSearchChange={handleSearchChange}
      isLoading={isPending}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={results} />
      </SearchDialogContent>
    </SearchDialog>
  )
}
