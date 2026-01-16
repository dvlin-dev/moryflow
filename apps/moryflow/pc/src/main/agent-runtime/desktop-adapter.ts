/**
 * Desktop 平台适配器
 * 实现 PlatformCapabilities 接口，提供 Electron/Node.js 环境的平台能力
 */

import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID as nodeRandomUUID } from 'node:crypto'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { safeStorage } from 'electron'
import Store from 'electron-store'
import chokidar from 'chokidar'
import type {
  PlatformCapabilities,
  FileSystem,
  PathUtils,
  Storage,
  SecureStorage,
  Logger,
  ShellResult,
  FileWatchEvent,
  FileInfo,
  CryptoUtils,
  AuthCapabilities,
} from '@anyhunt/agents-adapter'
import { membershipBridge } from '../membership-bridge.js'

const execAsync = promisify(exec)

/** 文件系统实现 */
const fileSystem: FileSystem = {
  async readFile(filePath: string, encoding: 'utf-8' = 'utf-8'): Promise<string> {
    return await fs.readFile(filePath, encoding)
  },

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf-8')
  },

  async delete(targetPath: string): Promise<void> {
    const stat = await fs.stat(targetPath)
    if (stat.isDirectory()) {
      await fs.rm(targetPath, { recursive: true, force: true })
    } else {
      await fs.unlink(targetPath)
    }
  },

  async move(from: string, to: string): Promise<void> {
    await fs.rename(from, to)
  },

  async mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    await fs.mkdir(dirPath, { recursive: options?.recursive ?? false })
  },

  async readdir(dirPath: string): Promise<string[]> {
    return await fs.readdir(dirPath)
  },

  async exists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath)
      return true
    } catch {
      return false
    }
  },

  async stat(targetPath: string): Promise<FileInfo> {
    const stat = await fs.stat(targetPath)
    return {
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
      size: stat.size,
      mtime: stat.mtimeMs,
    }
  },

  async access(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath, fsSync.constants.R_OK)
      return true
    } catch {
      return false
    }
  },
}

/** 路径工具实现 */
const pathUtils: PathUtils = {
  join: (...parts: string[]) => path.join(...parts),
  resolve: (...parts: string[]) => path.resolve(...parts),
  dirname: (filePath: string) => path.dirname(filePath),
  basename: (filePath: string, ext?: string) => path.basename(filePath, ext),
  extname: (filePath: string) => path.extname(filePath),
  isAbsolute: (filePath: string) => path.isAbsolute(filePath),
  normalize: (filePath: string) => path.normalize(filePath),
  relative: (from: string, to: string) => path.relative(from, to),
  sep: path.sep,
}

/** 通用存储实现（使用 electron-store） */
class ElectronStorage implements Storage {
  private store: Store

  constructor() {
    this.store = new Store({ name: 'agent-runtime-storage' })
  }

  async get<T>(key: string): Promise<T | null> {
    const value = this.store.get(key)
    return value === undefined ? null : (value as T)
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value)
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key)
  }
}

/** 安全存储实现（使用 Electron safeStorage） */
class ElectronSecureStorage implements SecureStorage {
  private store: Store
  private readonly prefix = 'secure:'

  constructor() {
    this.store = new Store({ name: 'agent-runtime-secure' })
  }

  async get(key: string): Promise<string | null> {
    const encrypted = this.store.get(this.prefix + key)
    if (!encrypted || !(encrypted instanceof Buffer)) {
      return null
    }
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[SecureStorage] encryption not available, returning null')
      return null
    }
    try {
      const decrypted = safeStorage.decryptString(encrypted)
      return decrypted
    } catch (error) {
      console.error('[SecureStorage] failed to decrypt', error)
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('[SecureStorage] encryption not available')
    }
    const encrypted = safeStorage.encryptString(value)
    this.store.set(this.prefix + key, encrypted)
  }

  async remove(key: string): Promise<void> {
    this.store.delete(this.prefix + key)
  }
}

/** 日志实现 */
const logger: Logger = {
  debug: (...args: unknown[]) => console.debug('[DesktopAdapter]', ...args),
  info: (...args: unknown[]) => console.info('[DesktopAdapter]', ...args),
  warn: (...args: unknown[]) => console.warn('[DesktopAdapter]', ...args),
  error: (...args: unknown[]) => console.error('[DesktopAdapter]', ...args),
}

/**
 * 检查是否为 exec 错误对象
 */
function isExecError(error: unknown): error is {
  stdout?: string
  stderr?: string
  message?: string
  code?: number
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('stdout' in error || 'stderr' in error || 'message' in error)
  )
}

/** Shell 执行实现 */
async function executeShell(
  command: string,
  cwd: string,
  timeout: number = 120000,
): Promise<ShellResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    })
    return {
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: 0,
    }
  } catch (error: unknown) {
    if (isExecError(error)) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || '',
        exitCode: error.code || 1,
      }
    }
    return {
      stdout: '',
      stderr: String(error),
      exitCode: 1,
    }
  }
}

/** 文件监听实现 */
function watchFiles(
  paths: string[],
  callback: (event: FileWatchEvent) => void,
): () => void {
  const watcher = chokidar.watch(paths, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  })

  watcher
    .on('add', (filePath) => callback({ type: 'add', path: filePath }))
    .on('change', (filePath) => callback({ type: 'change', path: filePath }))
    .on('unlink', (filePath) => callback({ type: 'unlink', path: filePath }))
    .on('addDir', (filePath) => callback({ type: 'addDir', path: filePath }))
    .on('unlinkDir', (filePath) => callback({ type: 'unlinkDir', path: filePath }))

  return () => {
    void watcher.close()
  }
}

/**
 * 加密工具实现
 */
const cryptoUtils: CryptoUtils = {
  sha256: (input: string | Uint8Array): string => {
    return createHash('sha256').update(input).digest('hex')
  },
  randomUUID: (): string => {
    return nodeRandomUUID()
  },
}

/** 认证能力实现 */
const auth: AuthCapabilities = {
  getToken: async () => membershipBridge.getConfig().token,
  getApiUrl: () => membershipBridge.getConfig().apiUrl,
}

/**
 * 创建 Desktop 平台能力实例
 */
export function createDesktopCapabilities(): PlatformCapabilities {
  return {
    fs: fileSystem,
    path: pathUtils,
    storage: new ElectronStorage(),
    secureStorage: new ElectronSecureStorage(),
    fetch: globalThis.fetch,
    logger,
    platform: 'desktop',
    optional: {
      executeShell,
      watchFiles,
    },
    auth,
  }
}

/**
 * 创建 Desktop 加密工具实例
 */
export function createDesktopCrypto(): CryptoUtils {
  return cryptoUtils
}
