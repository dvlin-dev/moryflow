import throttle from "lodash.throttle"
import { useCallback, useEffect, useMemo, useRef } from "react"

import { useUnmount } from "./use-unmount"

interface ThrottleSettings {
  leading?: boolean | undefined
  trailing?: boolean | undefined
}

const defaultOptions: ThrottleSettings = {
  leading: false,
  trailing: true,
}

/**
 * A hook that returns a throttled callback function.
 * Uses useRef to always call the latest callback, avoiding stale closures.
 *
 * @param fn The function to throttle
 * @param wait The time in ms to wait before calling the function
 * @param options The throttle options
 */
export function useThrottledCallback<T extends (...args: never[]) => unknown>(
  fn: T,
  wait = 250,
  options: ThrottleSettings = defaultOptions
): {
  (this: ThisParameterType<T>, ...args: Parameters<T>): ReturnType<T>
  cancel: () => void
  flush: () => void
} {
  // 使用 ref 存储最新的 fn，避免闭包过期
  const fnRef = useRef(fn)

  // 每次渲染时更新 ref
  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  // 创建稳定的 throttle 包装函数
  const throttledFn = useMemo(
    () =>
      throttle(
        (...args: Parameters<T>) => fnRef.current(...args) as ReturnType<T>,
        wait,
        options
      ),
    [wait, options]
  )

  useUnmount(() => {
    throttledFn.cancel()
  })

  return throttledFn as {
    (this: ThisParameterType<T>, ...args: Parameters<T>): ReturnType<T>
    cancel: () => void
    flush: () => void
  }
}

export default useThrottledCallback
