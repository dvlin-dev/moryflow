import type { MutableRefObject } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { UIMessage } from 'ai'
import type { StickToBottomContext } from 'use-stick-to-bottom'

const createPlaceholderMessage = (afterId: string): UIMessage => ({
  id: `placeholder-${afterId}`,
  role: 'assistant',
  parts: [],
})

const findLatestMessageByRole = (messages: UIMessage[], role: UIMessage['role']) =>
  [...messages].reverse().find((message) => message.role === role)

const insertPlaceholderMessage = (messages: UIMessage[], placeholder: UIMessage, afterId: string) => {
  const list = [...messages]
  const index = Math.max(0, list.findIndex((message) => message.id === afterId) + 1)
  list.splice(index, 0, placeholder)
  return list
}

type PlaceholderEntry = {
  afterId: string
  userHeight: number
  message: UIMessage
}

type StretchedAssistant = {
  messageId: string
  userHeight: number
}

export type UseConversationLayoutResult = {
  conversationContextRef: MutableRefObject<StickToBottomContext | null>
  registerMessageRef: (id: string, node: HTMLElement | null) => void
  renderMessages: UIMessage[]
  shouldShowTailThinking: boolean
  getMessageLayout: (message: UIMessage) => { isPlaceholder: boolean; minHeight?: string }
}

export const useConversationLayout = (
  messages: UIMessage[],
  status: string
): UseConversationLayoutResult => {
  const conversationContextRef = useRef<StickToBottomContext | null>(null)
  const messageRefs = useRef<Map<string, HTMLElement>>(new Map())
  const registerMessageRef = useCallback((id: string, node: HTMLElement | null) => {
    if (node) {
      messageRefs.current.set(id, node)
    } else {
      messageRefs.current.delete(id)
    }
  }, [])

  const lastUserMessageIdRef = useRef<string | null>(null)
  const lastAssistantMessageIdRef = useRef<string | null>(null)
  const initializedUserScrollRef = useRef(false)
  const [placeholderEntry, setPlaceholderEntry] = useState<PlaceholderEntry | null>(null)
  const [stretchedAssistant, setStretchedAssistant] = useState<StretchedAssistant | null>(null)

  const scrollMessageToTop = useCallback((messageId: string) => {
    const targetNode = messageRefs.current.get(messageId)
    const scrollEl = conversationContextRef.current?.scrollRef?.current
    if (!targetNode || !scrollEl) {
      return
    }
    conversationContextRef.current?.stopScroll?.()
    scrollEl.scrollTo({ top: targetNode.offsetTop, behavior: 'smooth' })
  }, [])

  useLayoutEffect(() => {
    if (status !== 'submitted') {
      if (placeholderEntry) {
        setPlaceholderEntry(null)
      }
      return
    }

    const latestUser = findLatestMessageByRole(messages, 'user')
    if (!latestUser) {
      if (placeholderEntry) {
        setPlaceholderEntry(null)
      }
      return
    }
    const node = messageRefs.current.get(latestUser.id)
    if (!node) {
      return
    }
    const userHeight = node.offsetHeight
    if (
      placeholderEntry?.afterId !== latestUser.id ||
      Math.abs((placeholderEntry?.userHeight ?? -1) - userHeight) > 1
    ) {
      setPlaceholderEntry({
        afterId: latestUser.id,
        userHeight,
        message: createPlaceholderMessage(latestUser.id),
      })
      setStretchedAssistant(null)
    }

    if (!initializedUserScrollRef.current || latestUser.id !== lastUserMessageIdRef.current) {
      initializedUserScrollRef.current = true
      lastUserMessageIdRef.current = latestUser.id
      requestAnimationFrame(() => {
        scrollMessageToTop(latestUser.id)
      })
    }
  }, [messages, status, placeholderEntry, scrollMessageToTop])

  useEffect(() => {
    const latestAssistant = findLatestMessageByRole(messages, 'assistant')
    if (!latestAssistant) {
      return
    }
    const node = messageRefs.current.get(latestAssistant.id)
    if (!node) {
      return
    }
    const isNewAssistant = latestAssistant.id !== lastAssistantMessageIdRef.current
    if (status === 'streaming' || isNewAssistant) {
      if (placeholderEntry && isNewAssistant) {
        setPlaceholderEntry(null)
        setStretchedAssistant({
          messageId: latestAssistant.id,
          userHeight: placeholderEntry.userHeight,
        })
      }
      if (isNewAssistant) {
        lastAssistantMessageIdRef.current = latestAssistant.id
      }
      requestAnimationFrame(() => {
        conversationContextRef.current?.stopScroll?.()
        node.scrollIntoView({
          block: 'end',
          behavior: status === 'streaming' ? 'auto' : 'smooth',
        })
      })
    }
  }, [messages, status, placeholderEntry])

  const renderMessages = useMemo(() => {
    if (!placeholderEntry) {
      return messages
    }
    return insertPlaceholderMessage(messages, placeholderEntry.message, placeholderEntry.afterId)
  }, [messages, placeholderEntry])

  const getMessageLayout = useCallback(
    (message: UIMessage) => {
      const isPlaceholder = placeholderEntry?.message.id === message.id
      const stretchTarget =
        (isPlaceholder && placeholderEntry) ||
        (stretchedAssistant && stretchedAssistant.messageId === message.id
          ? stretchedAssistant
          : null)
      const minHeight = stretchTarget
        ? `calc(calc(100% - ${stretchTarget.userHeight + 32}px))`
        : undefined
      return { isPlaceholder, minHeight }
    },
    [placeholderEntry, stretchedAssistant]
  )

  return {
    conversationContextRef,
    registerMessageRef,
    renderMessages,
    shouldShowTailThinking: status === 'streaming' && !placeholderEntry,
    getMessageLayout,
  }
}
