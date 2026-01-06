export const NODE_DIFF_THRESHOLD = 2000
export const WATCHER_READY_DEPTH = 2
export const WATCHER_SCHEDULE_DELAY = 800

export type FsEventType = 'file-added' | 'file-changed' | 'file-removed' | 'dir-added' | 'dir-removed'

export type EmitFsEvent = (type: FsEventType, changedPath: string) => void
