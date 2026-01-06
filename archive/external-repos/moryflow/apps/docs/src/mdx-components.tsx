import type { MDXComponents } from 'mdx/types'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { TypeTable } from 'fumadocs-ui/components/type-table'
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion'
import { File, Files, Folder } from 'fumadocs-ui/components/files'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { Step, Steps } from 'fumadocs-ui/components/steps'
import { Callout } from 'fumadocs-ui/components/callout'
import { Card, Cards } from 'fumadocs-ui/components/card'
import { DownloadButtons } from '@/components/download-buttons'

export function getMDXComponents(): MDXComponents {
  return {
    ...defaultMdxComponents,
    // Fumadocs UI components
    TypeTable,
    Accordion,
    Accordions,
    File,
    Files,
    Folder,
    Tab,
    Tabs,
    Step,
    Steps,
    Callout,
    Card,
    Cards,
    // Custom components
    DownloadButtons,
  }
}
