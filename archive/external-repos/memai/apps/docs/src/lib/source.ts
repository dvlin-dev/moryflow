import { allDocs, allMetas } from 'content-collections'
import { loader } from 'fumadocs-core/source'
import { createMDXSource } from '@fumadocs/content-collections'
import { i18n } from './i18n'

export const source = loader({
  baseUrl: '/docs',
  source: createMDXSource(allDocs, allMetas),
  i18n,
})
