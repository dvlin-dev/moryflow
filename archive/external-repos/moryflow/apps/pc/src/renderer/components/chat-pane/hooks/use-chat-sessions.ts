import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChatSessionEvent, ChatSessionSummary } from '@shared/ipc'

const sortSessions = (items: ChatSessionSummary[]) =>
  [...items].sort((a, b) => b.updatedAt - a.updatedAt)

const upsertSession = (items: ChatSessionSummary[], session: ChatSessionSummary) => {
  const next = items.filter((item) => item.id !== session.id)
  next.push(session)
  return sortSessions(next)
}

const removeSession = (items: ChatSessionSummary[], sessionId: string) =>
  items.filter((item) => item.id !== sessionId)

export const useChatSessions = () => {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const selectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId)
  }, [])

  const assignInitialActive = useCallback((nextSessions: ChatSessionSummary[]) => {
    if (!activeSessionId && nextSessions.length > 0) {
      setActiveSessionId(nextSessions[0].id)
    } else if (activeSessionId && !nextSessions.some((item) => item.id === activeSessionId)) {
      setActiveSessionId(nextSessions[0]?.id ?? null)
    }
  }, [activeSessionId])

  useEffect(() => {
    let mounted = true
    const bootstrap = async () => {
      if (!window.desktopAPI?.chat) {
        return
      }
      try {
        let list = await window.desktopAPI.chat.listSessions()
        if (!mounted) {
          return
        }
        if (list.length === 0) {
          const created = await window.desktopAPI.chat.createSession()
          list = [created]
        }
        const sorted = sortSessions(list)
        setSessions(sorted)
        assignInitialActive(sorted)
      } catch (error) {
        console.error('[chat-pane] failed to load chat sessions', error)
      } finally {
        if (mounted) {
          setReady(true)
        }
      }
    }
    void bootstrap()
    return () => {
      mounted = false
    }
  }, [assignInitialActive])

  useEffect(() => {
    if (!window.desktopAPI?.chat) {
      return
    }
    const dispose = window.desktopAPI.chat.onSessionEvent((event: ChatSessionEvent) => {
      setSessions((prev) => {
        if (event.type === 'deleted') {
          const next = removeSession(prev, event.sessionId)
          assignInitialActive(next)
          return next
        }
        const updated = upsertSession(prev, event.session)
        assignInitialActive(updated)
        return updated
      })
    })
    return () => {
      dispose?.()
    }
  }, [assignInitialActive])

  const createSession = useCallback(async () => {
    if (!window.desktopAPI?.chat) {
      return null
    }
    const session = await window.desktopAPI.chat.createSession()
    setSessions((prev) => upsertSession(prev, session))
    setActiveSessionId(session.id)
    return session
  }, [])

  const renameSession = useCallback(async (sessionId: string, title: string) => {
    if (!window.desktopAPI?.chat) {
      return
    }
    const session = await window.desktopAPI.chat.renameSession({ sessionId, title })
    setSessions((prev) => upsertSession(prev, session))
  }, [])

  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!window.desktopAPI?.chat) {
        return
      }
      await window.desktopAPI.chat.deleteSession({ sessionId })
      setSessions((prev) => {
        const next = removeSession(prev, sessionId)
        assignInitialActive(next)
        return next
      })
    },
    [assignInitialActive]
  )

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  )

  return {
    sessions,
    activeSession,
    activeSessionId,
    selectSession,
    createSession,
    renameSession,
    deleteSession,
    isReady: ready && Boolean(activeSessionId),
  }
}
