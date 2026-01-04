/**
 * Cloud Sync - 持久化存储
 * 单一职责：electron-store 读写操作
 */

import Store from 'electron-store'
import {
  STORE_NAME,
  DEFAULT_STORE,
  createDefaultSettings,
  type CloudSyncStoreSchema,
  type CloudSyncSettings,
  type VaultBinding,
} from './const.js'

const store = new Store<CloudSyncStoreSchema>({
  name: STORE_NAME,
  defaults: DEFAULT_STORE,
})

// ── Settings ────────────────────────────────────────────────

export const readSettings = (): CloudSyncSettings =>
  store.get('settings') ?? createDefaultSettings()

export const writeSettings = (settings: CloudSyncSettings): void => {
  store.set('settings', settings)
}

// ── Bindings ────────────────────────────────────────────────

export const readBindings = (): Record<string, VaultBinding> =>
  store.get('bindings') ?? {}

export const readBinding = (localPath: string): VaultBinding | null =>
  readBindings()[localPath] ?? null

export const writeBinding = (binding: VaultBinding): void => {
  const bindings = readBindings()
  bindings[binding.localPath] = binding
  store.set('bindings', bindings)
}

export const deleteBinding = (localPath: string): void => {
  const bindings = readBindings()
  delete bindings[localPath]
  store.set('bindings', bindings)
}
