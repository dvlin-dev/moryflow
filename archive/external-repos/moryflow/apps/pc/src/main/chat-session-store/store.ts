import Store from 'electron-store'
import { DEFAULT_STORE, STORE_NAME, type ChatSessionStoreShape, type PersistedChatSession } from './const.js'

const store = new Store<ChatSessionStoreShape>({
  name: STORE_NAME,
  defaults: DEFAULT_STORE,
})

export const readSessions = () => store.get('sessions') ?? DEFAULT_STORE.sessions

export const writeSessions = (sessions: Record<string, PersistedChatSession>) => {
  store.set('sessions', sessions)
}

export const takeSequence = () => {
  const current = store.get('sequence') ?? DEFAULT_STORE.sequence
  store.set('sequence', current + 1)
  return current
}

export const resetStore = () => {
  store.set('sessions', DEFAULT_STORE.sessions)
  store.set('sequence', DEFAULT_STORE.sequence)
}
