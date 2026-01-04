import { useEffect, useRef } from 'react'
import { HookResourceManager } from '@/lib/utils/resource-manager'

export function useResourceManager(): HookResourceManager {
  const ref = useRef<HookResourceManager | null>(null)
  if (!ref.current) ref.current = new HookResourceManager()

  useEffect(() => {
    const manager = ref.current!
    return () => {
      manager.disposeAll()
      ref.current = null
    }
  }, [])

  return ref.current!
}
