export type CommandAction = {
  id: string
  label: string
  description?: string
  shortcut?: string
  group?: string
  disabled?: boolean
  handler: () => void | Promise<void>
}

export type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: CommandAction[]
}

