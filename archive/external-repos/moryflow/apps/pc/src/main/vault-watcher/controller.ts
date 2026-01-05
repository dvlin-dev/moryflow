import path from 'node:path'
import chokidar, { type FSWatcher } from 'chokidar'
import { readVaultTree } from '../vault.js'
import { getTreeCache, setTreeCache } from '../tree-cache.js'
import {
  WATCHER_READY_DEPTH,
  WATCHER_SCHEDULE_DELAY,
  type EmitFsEvent
} from './const.js'
import { buildTreeChangePlan, normalizeExpandedPaths } from './handle.js'

export type VaultWatcherController = {
  start: (vaultPath: string) => Promise<void>
  scheduleStart: (vaultPath: string) => void
  stop: () => Promise<void>
  updateExpandedWatchers: (paths: string[]) => Promise<void>
}

/** 统一注册文件事件，避免重复样板代码 */
const registerFsEvents = (watcher: FSWatcher, emitFsEvent: EmitFsEvent) =>
  watcher
    .on('add', (filePath) => emitFsEvent('file-added', filePath))
    .on('change', (filePath) => emitFsEvent('file-changed', filePath))
    .on('unlink', (filePath) => emitFsEvent('file-removed', filePath))
    .on('addDir', (dirPath) => emitFsEvent('dir-added', dirPath))
    .on('unlinkDir', (dirPath) => emitFsEvent('dir-removed', dirPath))

const closeWatcherSafe = async (watcher: FSWatcher | null, label: string) => {
  if (!watcher) {
    return
  }
  try {
    await watcher.close()
  } catch (error) {
    console.warn(`[vault] ${label} watcher close error`, error)
  }
}

export const createVaultWatcherController = (emitFsEvent: EmitFsEvent): VaultWatcherController => {
  let vaultWatcher: FSWatcher | null = null
  let watchedVaultPath: string | null = null
  let watcherStartTimer: NodeJS.Timeout | null = null
  const expandedWatchers = new Map<string, FSWatcher>()
  const expandedWatchList = new Set<string>()

  const stop = async () => {
    if (watcherStartTimer) {
      clearTimeout(watcherStartTimer)
      watcherStartTimer = null
    }
    await closeWatcherSafe(vaultWatcher, 'vault')
    vaultWatcher = null
    watchedVaultPath = null

    for (const watcher of expandedWatchers.values()) {
      await closeWatcherSafe(watcher, 'expanded')
    }
    expandedWatchers.clear()
  }

  const emitChanges = (resolved: string, plan: ReturnType<typeof buildTreeChangePlan>) => {
    if (plan.type === 'none') {
      return
    }
    if (plan.type === 'full-refresh') {
      emitFsEvent('dir-added', resolved)
      return
    }
    for (const change of plan.changes) {
      emitFsEvent(change.type, change.path)
    }
  }

  const hydrateInitialDiff = async (resolved: string) => {
    const cached = getTreeCache(resolved)
    const latestRoot = await readVaultTree({ path: resolved })
    const considerPaths = expandedWatchList.size > 0 ? Array.from(expandedWatchList) : [resolved]
    const plan = buildTreeChangePlan({
      cachedNodes: cached?.nodes,
      latestNodes: latestRoot,
      considerPaths
    })
    emitChanges(resolved, plan)
    setTreeCache(resolved, latestRoot)
  }

  const startWatcher = async (resolved: string) => {
    try {
      vaultWatcher = chokidar.watch(resolved, {
        ignoreInitial: true,
        ignored: /(^|[\\/])\../,
        depth: WATCHER_READY_DEPTH
      })
      registerFsEvents(vaultWatcher, emitFsEvent).on('ready', () =>
        hydrateInitialDiff(resolved).catch((error) => console.warn('[vault] watcher ready diff failed', error))
      )

      vaultWatcher.on('error', (error) => console.error('[vault] watcher error', error))
    } catch (error) {
      console.error('[vault] failed to start watcher', error)
    }
  }

  const start = async (targetPath: string) => {
    const resolved = path.resolve(targetPath)
    if (watchedVaultPath === resolved && vaultWatcher) {
      return
    }

    await stop()
    watchedVaultPath = resolved
    await startWatcher(resolved)
  }

  const scheduleStart = (targetPath: string) => {
    const resolved = path.resolve(targetPath)
    watchedVaultPath = resolved
    if (watcherStartTimer) {
      clearTimeout(watcherStartTimer)
    }
    watcherStartTimer = setTimeout(() => {
      watcherStartTimer = null
      void start(resolved)
    }, WATCHER_SCHEDULE_DELAY)
  }

  const updateExpandedWatchers = async (paths: string[]) => {
    if (!watchedVaultPath) {
      return
    }
    const normalized = normalizeExpandedPaths(watchedVaultPath, paths)
    expandedWatchList.clear()
    for (const p of normalized) {
      expandedWatchList.add(p)
    }

    for (const [watchedPath, watcher] of expandedWatchers.entries()) {
      if (normalized.has(watchedPath)) {
        continue
      }
      await closeWatcherSafe(watcher, 'expanded')
      expandedWatchers.delete(watchedPath)
    }

    for (const candidate of normalized) {
      if (expandedWatchers.has(candidate)) {
        continue
      }
      try {
        const watcher = chokidar.watch(candidate, {
          ignoreInitial: true,
          ignored: /(^|[\\/])\../
        })
        registerFsEvents(watcher, emitFsEvent).on('error', (error) =>
          console.error('[vault] expanded watcher error', error)
        )

        expandedWatchers.set(candidate, watcher)
      } catch (error) {
        console.error('[vault] failed to start expanded watcher', error)
      }
    }
  }

  return {
    start,
    scheduleStart,
    stop,
    updateExpandedWatchers
  }
}
