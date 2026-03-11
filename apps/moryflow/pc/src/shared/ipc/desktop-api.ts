/**
 * [DEFINES]: DesktopApi IPC 类型定义（含会话压缩预处理/模式更新等渲染端契约）
 * [USED_BY]: preload/index.ts, renderer components, main IPC handlers
 * [POS]: PC IPC 类型入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { BetterAuthError } from '@moryflow/api';
import type { AgentApplyEditInput, AgentApplyEditResult } from './apply-edit';
import type {
  ChatApprovalContext,
  ChatApproveToolResult,
  ChatApprovalPromptConsumeResult,
  ChatGlobalPermissionMode,
  ChatGlobalPermissionModeEvent,
  ChatToolApprovalAction,
  AgentChatRequestOptions,
  ChatSessionMessagesSnapshot,
  ChatSessionEvent,
  ChatMessageEvent,
  ChatSessionSummary,
  UIMessage,
  UIMessageChunk,
} from './chat';
import type { SkillSummary, SkillDetail, RecommendedSkill } from './skills';
import type { AgentSettings, AgentSettingsUpdate } from './agent-settings';
import type { ResetAppResult } from './maintenance';
import type { McpStatusSnapshot, McpStatusEvent, McpTestInput, McpTestResult } from './mcp-status';
import type { AgentProviderTestInput, AgentProviderTestResult } from './provider-test';
import type {
  VaultCreateOptions,
  VaultFsEvent,
  VaultInfo,
  VaultItem,
  VaultOpenOptions,
  VaultTreeNode,
} from './vault';
import type {
  OllamaConnectionResult,
  OllamaLocalModel,
  OllamaOperationResult,
  OllamaPullProgressEvent,
  OllamaLibraryModel,
  OllamaLibrarySearchParams,
} from './ollama';
import type {
  CloudSyncSettings,
  VaultBinding,
  SyncStatusSnapshot,
  SyncStatusDetail,
  CloudVault,
  CloudUsageInfo,
  SemanticSearchResult,
  CloudSyncStatusEvent,
  BindVaultInput,
  SearchInput,
  BindingConflictRequest,
  BindingConflictResponse,
} from './cloud-sync';
import type {
  Site,
  BuildSiteInput,
  BuildProgressEvent,
  BuildSiteResult,
  CreateSiteInput,
  UpdateSiteInput,
  SubdomainCheckResult,
  SubdomainSuggestResult,
} from './site-publish';
import type { SandboxApi } from './sandbox';
import type {
  SearchQueryInput,
  SearchQueryResult,
  SearchStatus,
  SearchRebuildResult,
} from './search';
import type {
  MemoryOverview,
  MemorySearchInput,
  MemorySearchResult,
  MemoryListFactsInput,
  MemoryListFactsResult,
  MemoryFact,
  MemoryCreateFactInput,
  MemoryUpdateFactInput,
  MemoryBatchUpdateFactsInput,
  MemoryBatchDeleteFactsInput,
  MemoryFactHistory,
  MemoryFeedbackInput,
  MemoryFeedbackResult,
  MemoryGraphQueryInput,
  MemoryGraphQueryResult,
  MemoryEntityDetailInput,
  MemoryEntityDetail,
  MemoryExportResult,
  MemoryExportData,
} from './memory';
import type {
  TelegramPairingRequestItem,
  TelegramProxySuggestionInput,
  TelegramProxySuggestionResult,
  TelegramProxyTestInput,
  TelegramProxyTestResult,
  TelegramRuntimeStatusSnapshot,
  TelegramSettingsSnapshot,
  TelegramSettingsUpdateInput,
} from './telegram';
import type { AppCloseBehavior, LaunchAtLoginState } from './app-runtime';
import type {
  AppUpdateSettings,
  AppUpdateState,
  AppUpdateStateChangeEvent,
  UpdateChannel,
} from './app-update';
import type { QuickChatSetSessionInput, QuickChatWindowState } from './quick-chat';

export type MembershipAccessSessionPayload = {
  accessToken: string;
  accessTokenExpiresAt: string;
};

export type MembershipRefreshSessionResult =
  | { ok: true; payload: MembershipAccessSessionPayload }
  | {
      ok: false;
      reason: 'missing_refresh_token' | 'unauthorized' | 'network' | 'invalid_response';
    };

export type MembershipAuthUser = {
  id: string;
  email: string;
  name?: string;
};

export type MembershipAuthResult =
  | {
      ok: true;
      payload: MembershipAccessSessionPayload;
      user?: MembershipAuthUser;
    }
  | {
      ok: false;
      error: BetterAuthError;
    };

export type PersistedTab = {
  id: string;
  name: string;
  path: string;
  pinned?: boolean;
};

export type PersistedDocumentSession = {
  tabs: PersistedTab[];
  activePath: string | null;
};

export type DesktopApi = {
  getAppVersion: () => Promise<string>;
  membership: {
    /** 同步会员 token 到 main 进程 */
    syncToken: (token: string | null) => Promise<void>;
    /** 同步会员模型启用状态 */
    syncEnabled: (enabled: boolean) => Promise<void>;
    /** 本地凭据存储是否可用 */
    isSecureStorageAvailable: () => Promise<boolean>;
    /** 获取 access token（本地凭据存储） */
    getAccessToken: () => Promise<string | null>;
    /** 保存 access token（本地凭据存储） */
    setAccessToken: (token: string) => Promise<void>;
    /** 清理 access token（本地凭据存储） */
    clearAccessToken: () => Promise<void>;
    /** 获取 access token 过期时间（本地凭据存储） */
    getAccessTokenExpiresAt: () => Promise<string | null>;
    /** 保存 access token 过期时间（本地凭据存储） */
    setAccessTokenExpiresAt: (expiresAt: string) => Promise<void>;
    /** 清理 access token 过期时间（本地凭据存储） */
    clearAccessTokenExpiresAt: () => Promise<void>;
    /** 是否存在 refresh token（本地凭据存储） */
    hasRefreshToken: () => Promise<boolean>;
    /** main 进程执行邮箱密码登录并持久化 refresh token */
    signInWithEmail: (email: string, password: string) => Promise<MembershipAuthResult>;
    /** main 进程执行邮箱 OTP 验证并持久化 refresh token */
    verifyEmailOTP: (email: string, otp: string) => Promise<MembershipAuthResult>;
    /** main 进程完成邮箱注册并持久化 refresh token */
    completeEmailSignUp: (signupToken: string, password: string) => Promise<MembershipAuthResult>;
    /** main 进程执行 Google code exchange 并持久化 refresh token */
    exchangeGoogleCode: (code: string, nonce: string) => Promise<MembershipAuthResult>;
    /** 使用主进程本地凭据存储的 refresh token 执行刷新 */
    refreshSession: () => Promise<MembershipRefreshSessionResult>;
    /** 使用主进程本地凭据存储的 refresh token 执行登出 */
    logout: () => Promise<void>;
    /** 清理 access/refresh token 本地凭据存储 */
    clearSession: () => Promise<void>;
    /** 在系统浏览器中打开 OAuth 授权地址 */
    openExternal: (url: string) => Promise<void>;
    /** 启动开发态 OAuth localhost 回调监听 */
    startOAuthCallbackLoopback?: () => Promise<{ callbackUrl: string } | null>;
    /** 停止开发态 OAuth localhost 回调监听 */
    stopOAuthCallbackLoopback?: () => Promise<void>;
    /** 监听 OAuth deep link 回调 */
    onOAuthCallback: (handler: (payload: { code: string; nonce: string }) => void) => () => void;
  };
  payment: {
    /** 在系统浏览器中打开支付链接 */
    openCheckout: (url: string) => Promise<void>;
    /** 监听支付成功事件（Deep Link 回调） */
    onSuccess: (handler: () => void) => () => void;
  };
  vault: {
    open: (options?: VaultOpenOptions) => Promise<VaultInfo | null>;
    create?: (options: VaultCreateOptions) => Promise<VaultInfo | null>;
    /** 确保存在默认 Workspace（用于首次启动自动创建） */
    ensureDefaultWorkspace: () => Promise<VaultItem | null>;
    selectDirectory?: () => Promise<string | null>;
    readTree: (path: string) => Promise<VaultTreeNode[]>;
    readTreeRoot: (path: string) => Promise<VaultTreeNode[]>;
    readTreeChildren: (path: string) => Promise<VaultTreeNode[]>;
    updateWatchPaths: (paths: string[]) => Promise<void>;
    getTreeCache: (
      vaultPath: string
    ) => Promise<{ capturedAt: number; nodes: VaultTreeNode[] } | null>;
    setTreeCache: (params: { vaultPath: string; nodes: VaultTreeNode[] }) => Promise<void>;
    // ── 多 Vault 支持 ──────────────────────────────────────────
    /** 获取所有 Vault 列表 */
    getVaults: () => Promise<VaultItem[]>;
    /** 获取当前活动 Vault */
    getActiveVault: () => Promise<VaultItem | null>;
    /** 切换到指定 Vault */
    setActiveVault: (vaultId: string) => Promise<VaultItem | null>;
    /** 从列表移除 Vault（不删除文件） */
    removeVault: (vaultId: string) => Promise<void>;
    /** 重命名 Vault */
    renameVault: (vaultId: string, name: string) => Promise<void>;
    /** 验证工作区：检查目录是否存在，删除不存在的 */
    validateVaults: () => Promise<{ removedCount: number }>;
    /** Vault 列表变更事件 */
    onVaultsChange?: (handler: (vaults: VaultItem[]) => void) => () => void;
    /** 活动 Vault 变更事件 */
    onActiveVaultChange?: (handler: (vault: VaultItem | null) => void) => () => void;
  };
  workspace: {
    getExpandedPaths: (vaultPath: string) => Promise<string[]>;
    setExpandedPaths: (vaultPath: string, paths: string[]) => Promise<void>;
    /** 获取上次使用的 SidebarMode（全局）：Chat / Home */
    getLastSidebarMode: () => Promise<'chat' | 'home'>;
    /** 写入上次使用的 SidebarMode（全局）：Chat / Home */
    setLastSidebarMode: (mode: 'chat' | 'home') => Promise<void>;
    getDocumentSession: (vaultPath: string) => Promise<PersistedDocumentSession>;
    setDocumentSession: (vaultPath: string, session: PersistedDocumentSession) => Promise<void>;
    /** 获取最近操作的文件路径（按 Vault） */
    getRecentFiles: (vaultPath: string) => Promise<string[]>;
    /** 记录最近操作的文件（按 Vault） */
    recordRecentFile: (vaultPath: string, filePath: string | null) => Promise<void>;
    /** 移除最近操作的文件（按 Vault） */
    removeRecentFile: (vaultPath: string, filePath: string | null) => Promise<void>;
  };
  files: {
    read: (path: string) => Promise<{ content: string; mtime: number }>;
    write: (input: {
      path: string;
      content: string;
      clientMtime?: number;
    }) => Promise<{ mtime: number }>;
    createFile: (input: {
      parentPath: string;
      name: string;
      template?: string;
    }) => Promise<{ path: string }>;
    createFolder: (input: { parentPath: string; name: string }) => Promise<{ path: string }>;
    rename: (input: { path: string; nextName: string }) => Promise<{ path: string }>;
    move: (input: { path: string; targetDir: string }) => Promise<{ path: string }>;
    delete: (input: { path: string }) => Promise<void>;
    showInFinder: (input: { path: string }) => Promise<void>;
    openPath: (input: { path: string }) => Promise<void>;
  };
  events: {
    /**
     * 订阅 Vault 文件系统事件，返回取消订阅函数。
     */
    onVaultFsEvent: (handler: (event: VaultFsEvent) => void) => () => void;
  };
  chat: {
    send: (payload: {
      chatId: string;
      channel: string;
      trigger: 'submit-message' | 'regenerate-message';
      messageId?: string;
      messages: UIMessage[];
      agentOptions?: AgentChatRequestOptions;
    }) => Promise<{ ok: boolean }>;
    stop: (payload: { channel: string }) => Promise<{ ok: boolean }>;
    approveTool: (payload: {
      approvalId: string;
      action: ChatToolApprovalAction;
    }) => Promise<ChatApproveToolResult>;
    getApprovalContext: (payload: { approvalId: string }) => Promise<ChatApprovalContext>;
    consumeFullAccessUpgradePrompt: () => Promise<ChatApprovalPromptConsumeResult>;
    /**
     * 订阅流式响应，回调收到 null 表示流结束。
     */
    onChunk: (channel: string, handler: (chunk: UIMessageChunk | null) => void) => () => void;
    listSessions: () => Promise<ChatSessionSummary[]>;
    createSession: () => Promise<ChatSessionSummary>;
    renameSession: (input: { sessionId: string; title: string }) => Promise<ChatSessionSummary>;
    /** AI 生成会话标题 */
    generateSessionTitle: (input: {
      sessionId: string;
      userMessage: string;
      preferredModelId?: string;
    }) => Promise<ChatSessionSummary | null>;
    deleteSession: (input: { sessionId: string }) => Promise<{ ok: boolean }>;
    getSessionMessages: (input: { sessionId: string }) => Promise<ChatSessionMessagesSnapshot>;
    /**
     * 发送前预处理会话压缩，必要时返回新的 UI 消息列表。
     */
    prepareCompaction: (input: {
      sessionId: string;
      preferredModelId?: string;
    }) => Promise<{ changed: boolean; messages?: UIMessage[] }>;
    /** 截断会话历史到指定索引（用于重发、重试） */
    truncateSession: (input: { sessionId: string; index: number }) => Promise<{ ok: boolean }>;
    /** 替换指定索引的消息内容（用于编辑重发） */
    replaceMessage: (input: {
      sessionId: string;
      index: number;
      content: string;
    }) => Promise<{ ok: boolean }>;
    /** 从指定位置分支出新会话 */
    forkSession: (input: { sessionId: string; atIndex: number }) => Promise<ChatSessionSummary>;
    /** 获取全局权限模式 */
    getGlobalMode: () => Promise<ChatGlobalPermissionMode>;
    /** 设置全局权限模式（对所有对话生效） */
    setGlobalMode: (input: {
      mode: ChatGlobalPermissionMode;
      sessionId?: string;
    }) => Promise<ChatGlobalPermissionMode>;
    /** 订阅全局权限模式变更 */
    onGlobalModeChanged: (handler: (event: ChatGlobalPermissionModeEvent) => void) => () => void;
    onSessionEvent: (handler: (event: ChatSessionEvent) => void) => () => void;
    onMessageEvent: (handler: (event: ChatMessageEvent) => void) => () => void;
    applyEdit?: (input: AgentApplyEditInput) => Promise<AgentApplyEditResult>;
  };
  search: {
    query: (input: SearchQueryInput) => Promise<SearchQueryResult>;
    rebuild: () => Promise<SearchRebuildResult>;
    getStatus: () => Promise<SearchStatus>;
  };
  agent: {
    getSettings: () => Promise<AgentSettings>;
    updateSettings: (input: AgentSettingsUpdate) => Promise<AgentSettings>;
    onSettingsChange?: (handler: (settings: AgentSettings) => void) => () => void;
    listSkills: () => Promise<SkillSummary[]>;
    refreshSkills: () => Promise<SkillSummary[]>;
    getSkillDetail: (input: { name: string }) => Promise<SkillDetail>;
    setSkillEnabled: (input: { name: string; enabled: boolean }) => Promise<SkillSummary>;
    uninstallSkill: (input: { name: string }) => Promise<{ ok: boolean }>;
    installSkill: (input: { name: string }) => Promise<SkillSummary>;
    listRecommendedSkills: () => Promise<RecommendedSkill[]>;
    openSkillDirectory: (input: { name: string }) => Promise<{ ok: boolean }>;
    /** 获取 MCP 服务器状态快照 */
    getMcpStatus: () => Promise<McpStatusSnapshot>;
    /** 订阅 MCP 状态变更事件 */
    onMcpStatusChange: (handler: (event: McpStatusEvent) => void) => () => void;
    /** 测试单个 MCP 服务器连接 */
    testMcpServer: (input: McpTestInput) => Promise<McpTestResult>;
    /** 重新加载 MCP 配置 */
    reloadMcp: () => Promise<void>;
  };
  telegram: {
    isSecureStorageAvailable: () => Promise<boolean>;
    getSettings: () => Promise<TelegramSettingsSnapshot>;
    updateSettings: (input: TelegramSettingsUpdateInput) => Promise<TelegramSettingsSnapshot>;
    getStatus: () => Promise<TelegramRuntimeStatusSnapshot>;
    listPairingRequests: (input?: {
      accountId?: string;
      status?: TelegramPairingRequestItem['status'];
    }) => Promise<TelegramPairingRequestItem[]>;
    testProxyConnection: (input: TelegramProxyTestInput) => Promise<TelegramProxyTestResult>;
    detectProxySuggestion: (
      input: TelegramProxySuggestionInput
    ) => Promise<TelegramProxySuggestionResult>;
    approvePairingRequest: (input: { requestId: string }) => Promise<{ ok: boolean }>;
    denyPairingRequest: (input: { requestId: string }) => Promise<{ ok: boolean }>;
    onStatusChange: (handler: (status: TelegramRuntimeStatusSnapshot) => void) => () => void;
  };
  quickChat: {
    toggle: () => Promise<void>;
    open: () => Promise<void>;
    close: () => Promise<void>;
    getState: () => Promise<QuickChatWindowState>;
    setSessionId: (input: QuickChatSetSessionInput) => Promise<void>;
  };
  appRuntime: {
    getCloseBehavior: () => Promise<AppCloseBehavior>;
    setCloseBehavior: (behavior: AppCloseBehavior) => Promise<AppCloseBehavior>;
    getLaunchAtLogin: () => Promise<LaunchAtLoginState>;
    setLaunchAtLogin: (enabled: boolean) => Promise<LaunchAtLoginState>;
  };
  updates: {
    getState: () => Promise<AppUpdateState>;
    getSettings: () => Promise<AppUpdateSettings>;
    setChannel: (channel: UpdateChannel) => Promise<AppUpdateSettings>;
    setAutoCheck: (enabled: boolean) => Promise<AppUpdateSettings>;
    setAutoDownload: (enabled: boolean) => Promise<AppUpdateSettings>;
    checkForUpdates: () => Promise<AppUpdateState>;
    downloadUpdate: () => Promise<AppUpdateState>;
    restartToInstall: () => Promise<void>;
    skipVersion: (version?: string | null) => Promise<AppUpdateSettings>;
    openReleaseNotes: () => Promise<void>;
    openDownloadPage: () => Promise<void>;
    onStateChange: (handler: (event: AppUpdateStateChangeEvent) => void) => () => void;
  };
  testAgentProvider: (input: AgentProviderTestInput) => Promise<AgentProviderTestResult>;
  maintenance?: {
    /** 重置软件设置（删除整个数据目录，重启后生效） */
    resetApp: () => Promise<ResetAppResult>;
  };
  ollama: {
    /** 检测 Ollama 服务连接状态 */
    checkConnection: (baseUrl?: string) => Promise<OllamaConnectionResult>;
    /** 获取本地已安装的模型列表 */
    getLocalModels: (baseUrl?: string) => Promise<OllamaLocalModel[]>;
    /** 获取模型库列表 */
    getLibraryModels: (params?: OllamaLibrarySearchParams) => Promise<OllamaLibraryModel[]>;
    /** 下载模型 */
    pullModel: (name: string, baseUrl?: string) => Promise<OllamaOperationResult>;
    /** 删除本地模型 */
    deleteModel: (name: string, baseUrl?: string) => Promise<OllamaOperationResult>;
    /** 订阅下载进度事件 */
    onPullProgress: (handler: (event: OllamaPullProgressEvent) => void) => () => void;
  };
  cloudSync: {
    // ── 设置 ─────────────────────────────────────────────────
    /** 获取云同步设置 */
    getSettings: () => Promise<CloudSyncSettings>;
    /** 更新云同步设置 */
    updateSettings: (patch: Partial<CloudSyncSettings>) => Promise<CloudSyncSettings>;

    // ── Vault 绑定 ───────────────────────────────────────────
    /** 获取本地路径的 Vault 绑定信息 */
    getBinding: (localPath: string) => Promise<VaultBinding | null>;
    /** 绑定本地路径到云端 Vault */
    bindVault: (input: BindVaultInput) => Promise<VaultBinding>;
    /** 解除绑定 */
    unbindVault: (localPath: string) => Promise<void>;
    /** 获取云端 Vault 列表 */
    listCloudVaults: () => Promise<CloudVault[]>;

    // ── 同步控制 ─────────────────────────────────────────────
    /** 获取同步状态快照 */
    getStatus: () => Promise<SyncStatusSnapshot>;
    /** 获取包含活动详情的状态快照 */
    getStatusDetail: () => Promise<SyncStatusDetail>;
    /** 手动触发同步 */
    triggerSync: () => Promise<void>;
    /** 订阅状态变更 */
    onStatusChange: (handler: (event: CloudSyncStatusEvent) => void) => () => void;

    // ── 用量 ─────────────────────────────────────────────────
    /** 获取用量信息 */
    getUsage: () => Promise<CloudUsageInfo>;

    // ── 搜索 ─────────────────────────────────────────────────
    /** 语义搜索 */
    search: (input: SearchInput) => Promise<SemanticSearchResult[]>;

    // ── 绑定冲突处理 ─────────────────────────────────────────
    /** 响应绑定冲突请求 */
    respondBindingConflict: (response: BindingConflictResponse) => Promise<void>;
    /** 订阅绑定冲突请求 */
    onBindingConflictRequest: (handler: (request: BindingConflictRequest) => void) => () => void;
  };
  memory: {
    getOverview: () => Promise<MemoryOverview>;
    search: (input: MemorySearchInput) => Promise<MemorySearchResult>;
    listFacts: (input?: MemoryListFactsInput) => Promise<MemoryListFactsResult>;
    getFactDetail: (factId: string) => Promise<MemoryFact>;
    createFact: (input: MemoryCreateFactInput) => Promise<MemoryFact>;
    updateFact: (input: MemoryUpdateFactInput) => Promise<MemoryFact>;
    deleteFact: (factId: string) => Promise<void>;
    batchUpdateFacts: (input: MemoryBatchUpdateFactsInput) => Promise<{ updatedCount: number }>;
    batchDeleteFacts: (input: MemoryBatchDeleteFactsInput) => Promise<{ deletedCount: number }>;
    getFactHistory: (factId: string) => Promise<MemoryFactHistory>;
    feedbackFact: (input: MemoryFeedbackInput) => Promise<MemoryFeedbackResult>;
    queryGraph: (input?: MemoryGraphQueryInput) => Promise<MemoryGraphQueryResult>;
    getEntityDetail: (input: MemoryEntityDetailInput) => Promise<MemoryEntityDetail>;
    createExport: () => Promise<MemoryExportResult>;
    getExport: (exportId: string) => Promise<MemoryExportData>;
  };
  sitePublish: {
    // ── 站点管理 ─────────────────────────────────────────────
    /** 获取站点列表 */
    list: () => Promise<Site[]>;
    /** 创建站点 */
    create: (input: CreateSiteInput) => Promise<Site>;
    /** 获取站点详情 */
    get: (siteId: string) => Promise<Site>;
    /** 更新站点 */
    update: (input: UpdateSiteInput) => Promise<Site>;
    /** 删除站点 */
    delete: (siteId: string) => Promise<{ ok: boolean }>;
    /** 下线站点 */
    offline: (siteId: string) => Promise<{ ok: boolean }>;
    /** 上线站点 */
    online: (siteId: string) => Promise<{ ok: boolean }>;
    /** 获取站点页面列表 */
    getPages: (siteId: string) => Promise<{ path: string; localFilePath: string | null }[]>;

    // ── 子域名 ───────────────────────────────────────────────
    /** 检查子域名可用性 */
    checkSubdomain: (subdomain: string) => Promise<SubdomainCheckResult>;
    /** 推荐子域名 */
    suggestSubdomain: (base: string) => Promise<SubdomainSuggestResult>;

    // ── 构建发布 ─────────────────────────────────────────────
    /** 构建并发布站点 */
    buildAndPublish: (input: BuildSiteInput) => Promise<BuildSiteResult>;
    /** 订阅构建进度 */
    onProgress: (handler: (event: BuildProgressEvent) => void) => () => void;
    /** 检测文件变更 */
    detectChanges: (
      sourcePaths: string[],
      lastHashes: Record<string, string>
    ) => Promise<{
      hasChanges: boolean;
      changedFiles: string[];
    }>;
    /** 更新站点内容（重新构建上传） */
    updateContent: (siteId: string) => Promise<BuildSiteResult>;
  };
  sandbox: SandboxApi;
};
