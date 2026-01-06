export type InputDialogProps = {
  open: boolean
  title: string
  description?: string
  defaultValue?: string
  placeholder?: string
  onConfirm: (value: string) => void
  onCancel: () => void
}
