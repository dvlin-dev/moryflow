import { useCallback, useState } from 'react'

type InputDialogState = {
  open: boolean
  title: string
  description?: string
  defaultValue?: string
  placeholder?: string
  resolve: ((value: string | null) => void) | null
}

export const useInputDialog = () => {
  const [state, setState] = useState<InputDialogState>({
    open: false,
    title: '',
    description: undefined,
    defaultValue: undefined,
    placeholder: undefined,
    resolve: null,
  })

  const showInputDialog = useCallback(
    (options: {
      title: string
      description?: string
      defaultValue?: string
      placeholder?: string
    }): Promise<string | null> => {
      return new Promise((resolve) => {
        setState({
          open: true,
          title: options.title,
          description: options.description,
          defaultValue: options.defaultValue,
          placeholder: options.placeholder,
          resolve,
        })
      })
    },
    []
  )

  const handleConfirm = useCallback(
    (value: string) => {
      if (state.resolve) {
        state.resolve(value)
      }
      setState({
        open: false,
        title: '',
        description: undefined,
        defaultValue: undefined,
        placeholder: undefined,
        resolve: null,
      })
    },
    [state.resolve]
  )

  const handleCancel = useCallback(() => {
    if (state.resolve) {
      state.resolve(null)
    }
    setState({
      open: false,
      title: '',
      description: undefined,
      defaultValue: undefined,
      placeholder: undefined,
      resolve: null,
    })
  }, [state.resolve])

  return {
    inputDialogState: state,
    showInputDialog,
    handleConfirm,
    handleCancel,
  }
}
