/**
 * [PROVIDES]: 命令过滤器 - 危险命令拦截 + 白名单机制
 * [DEPENDS]: types
 * [POS]: 在命令执行前检查命令安全性
 */

export interface CommandFilterResult {
  allowed: boolean
  reason?: string
  requiresConfirmation?: boolean
}

/**
 * 危险命令模式 - 即使在 unrestricted 模式也会拦截
 */
const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // 系统破坏性命令
  { pattern: /\brm\s+(-[rf]+\s+)*\/\s*$/, reason: 'Removing root directory is not allowed' },
  { pattern: /\brm\s+(-[rf]+\s+)*\/\*/, reason: 'Removing root directory contents is not allowed' },
  { pattern: /\brm\s+(-[rf]+\s+)*~\/?\s*$/, reason: 'Removing home directory is not allowed' },
  { pattern: /\bmkfs\b/, reason: 'Filesystem formatting is not allowed' },
  { pattern: /\bdd\s+.*if=\/dev\/(zero|random|urandom).*of=\/dev\//, reason: 'Direct disk write is not allowed' },
  { pattern: /:?\(\)\s*\{\s*:?\s*\|\s*:?\s*&\s*\}/, reason: 'Fork bomb detected' },

  // 系统关键目录操作
  { pattern: /\brm\s+(-[rf]+\s+)*\/etc\b/, reason: 'Removing /etc is not allowed' },
  { pattern: /\brm\s+(-[rf]+\s+)*\/bin\b/, reason: 'Removing /bin is not allowed' },
  { pattern: /\brm\s+(-[rf]+\s+)*\/usr\b/, reason: 'Removing /usr is not allowed' },
  { pattern: /\brm\s+(-[rf]+\s+)*\/var\b/, reason: 'Removing /var is not allowed' },
  { pattern: /\brm\s+(-[rf]+\s+)*\/System\b/, reason: 'Removing /System is not allowed' },
  { pattern: /\brm\s+(-[rf]+\s+)*\/Library\b/, reason: 'Removing /Library is not allowed' },

  // 危险的权限操作
  { pattern: /\bchmod\s+(-R\s+)?777\s+\//, reason: 'Setting 777 on root paths is not allowed' },
  { pattern: /\bchown\s+(-R\s+)?.*\s+\/\s*$/, reason: 'Changing ownership of root is not allowed' },

  // 网络攻击相关
  { pattern: /\bcurl\s+.*\|\s*(ba)?sh/, reason: 'Piping curl to shell is not allowed' },
  { pattern: /\bwget\s+.*\|\s*(ba)?sh/, reason: 'Piping wget to shell is not allowed' },

  // 进程注入
  { pattern: /\bkill\s+-9\s+1\b/, reason: 'Killing init process is not allowed' },
  { pattern: /\bkillall\s+/, reason: 'killall command requires confirmation' },
]

/**
 * 命令白名单 - 安全命令列表
 * 不在白名单中的命令需要用户确认
 */
const WHITELISTED_COMMANDS = new Set([
  // 文件查看
  'cat', 'head', 'tail', 'less', 'more', 'wc', 'file', 'stat',

  // 目录操作
  'ls', 'pwd', 'cd', 'find', 'tree', 'du', 'df',

  // 文本处理
  'grep', 'awk', 'sed', 'sort', 'uniq', 'cut', 'tr', 'diff', 'echo', 'printf',

  // 文件操作（受路径检测保护）
  'cp', 'mv', 'mkdir', 'touch', 'rm', 'ln',

  // 压缩解压
  'tar', 'zip', 'unzip', 'gzip', 'gunzip', 'bzip2',

  // 开发工具
  'git', 'npm', 'npx', 'pnpm', 'yarn', 'node', 'python', 'python3', 'pip', 'pip3',
  'cargo', 'rustc', 'go', 'java', 'javac', 'mvn', 'gradle',
  'make', 'cmake', 'gcc', 'g++', 'clang',

  // 编辑器
  'code', 'vim', 'nvim', 'nano', 'emacs',

  // 网络工具（只读）
  'curl', 'wget', 'ping', 'dig', 'nslookup', 'host',

  // 系统信息
  'uname', 'whoami', 'id', 'date', 'cal', 'uptime', 'hostname',
  'ps', 'top', 'htop', 'free', 'vmstat', 'iostat',

  // 权限（基本）
  'chmod', 'chown',

  // 其他常用
  'env', 'export', 'which', 'where', 'type', 'alias',
  'xargs', 'tee', 'time', 'timeout', 'watch',
  'jq', 'yq', 'base64', 'md5', 'sha256sum', 'openssl',
])

/**
 * 从命令字符串中提取主命令
 */
function extractMainCommand(command: string): string | null {
  // 移除前导空格和环境变量设置
  const trimmed = command.trim()

  // 处理 sudo
  let cmd = trimmed.replace(/^sudo\s+/, '')

  // 处理环境变量设置 (VAR=value cmd)
  cmd = cmd.replace(/^(\w+=\S+\s+)+/, '')

  // 处理 shell 内置命令包装
  cmd = cmd.replace(/^(bash|sh|zsh)\s+(-c\s+)?['"]?/, '')

  // 提取第一个词作为命令
  const match = cmd.match(/^([a-zA-Z0-9_.-]+)/)
  return match ? match[1] : null
}

/**
 * 检查命令是否包含危险模式
 */
function checkDangerousPatterns(command: string): CommandFilterResult {
  for (const { pattern, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { allowed: false, reason }
    }
  }
  return { allowed: true }
}

/**
 * 检查命令是否在白名单中
 */
function checkWhitelist(command: string): CommandFilterResult {
  const mainCommand = extractMainCommand(command)

  if (!mainCommand) {
    return {
      allowed: true,
      requiresConfirmation: true,
      reason: 'Unable to parse command, requires confirmation',
    }
  }

  if (WHITELISTED_COMMANDS.has(mainCommand)) {
    return { allowed: true }
  }

  return {
    allowed: true,
    requiresConfirmation: true,
    reason: `Command "${mainCommand}" is not in whitelist, requires confirmation`,
  }
}

/**
 * 命令过滤器 - 检查命令是否安全
 *
 * @param command - 要执行的命令
 * @returns 过滤结果
 */
export function filterCommand(command: string): CommandFilterResult {
  // 1. 先检查危险模式（硬性拦截）
  const dangerCheck = checkDangerousPatterns(command)
  if (!dangerCheck.allowed) {
    return dangerCheck
  }

  // 2. 检查白名单（需确认的命令）
  return checkWhitelist(command)
}

/**
 * 检查命令是否需要用户确认
 */
export function commandRequiresConfirmation(command: string): boolean {
  const result = filterCommand(command)
  return result.requiresConfirmation === true
}

/**
 * 检查命令是否被硬性拦截
 */
export function isCommandBlocked(command: string): boolean {
  const result = filterCommand(command)
  return !result.allowed
}

/**
 * 获取命令拦截原因
 */
export function getBlockReason(command: string): string | undefined {
  const result = filterCommand(command)
  return result.reason
}
