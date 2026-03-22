export type {
  VaultInfo,
  VaultItem,
  VaultOpenOptions,
  VaultCreateOptions,
  VaultTreeNode,
  VaultFsEvent,
} from './vault';

export type {
  AgentChatContext,
  AgentChatRequestOptions,
  AgentThinkingSelection,
  AgentThinkingProfile,
  AgentSelectedSkill,
  AgentAccessMode,
  ChatGlobalPermissionMode,
  ChatGlobalPermissionModeEvent,
  ChatApprovalContext,
  ChatApprovalPromptConsumeResult,
  ChatSessionSummary,
  ChatSessionEvent,
  ChatSessionMessagesSnapshot,
  ChatMessageEvent,
  UIMessage,
  UIMessageChunk,
  TokenUsage,
} from './chat';

export type { SkillSummary, SkillDetail, RecommendedSkill } from './skills';

export type {
  MCPStdioServerSetting,
  MCPStreamableHttpServerSetting,
  MCPSettings,
  AgentModelSettings,
  AgentPersonalizationSettings,
  AgentUISettings,
  AgentSettings,
  AgentSettingsUpdate,
  UserProviderConfig,
  CustomProviderConfig,
  ProviderConfig,
  ProviderSdkType,
  UserModelConfig,
} from './agent-settings';

export type { ResetAppResult } from './maintenance';

export type { AgentApplyEditInput, AgentApplyEditResult } from './apply-edit';

export type { AgentProviderTestInput, AgentProviderTestResult } from './provider-test';

export type {
  AppCloseBehavior,
  LaunchAtLoginState,
  AppRuntimeErrorCode,
  AppRuntimeErrorPayload,
  AppRuntimeResult,
} from './app-runtime';

export type {
  UpdateStatus,
  AppUpdateProgress,
  AppUpdateSettings,
  AppUpdateState,
  AppUpdateStateChangeEvent,
} from './app-update';

export type { QuickChatWindowState, QuickChatSetSessionInput } from './quick-chat';

export type {
  McpServerStatus,
  McpServerState,
  McpStatusSnapshot,
  McpStatusEvent,
  McpTestInput,
  McpTestResult,
} from './mcp-status';

export type {
  OllamaConnectionResult,
  OllamaLocalModel,
  OllamaOperationResult,
  OllamaPullProgressEvent,
  OllamaLibraryModel,
  OllamaLibrarySearchParams,
} from './ollama';

export type {
  CloudSyncSettings,
  VaultBinding,
  SyncStatusSnapshot,
  SyncEngineStatus,
  SyncNotice,
  // Phase 4: 同步活动追踪类型
  SyncActivity,
  SyncActivityStatus,
  SyncDirection,
  PendingFile,
  SyncStatusDetail,
  // 其他类型
  CloudVault,
  CloudUsageInfo,
  SemanticSearchResult,
  CloudSyncStatusEvent,
  BindVaultInput,
  SearchInput,
} from './cloud-sync';

export type {
  MemoryBindingDisabledReason,
  MemoryOverview,
  MemoryKnowledgeStatusFilter,
  MemoryKnowledgeStatusItem,
  MemoryKnowledgeStatusesInput,
  MemoryKnowledgeStatusesResult,
  MemoryFactKind,
  MemoryFact,
  MemorySearchInput,
  MemorySearchFileItem,
  MemorySearchFactItem,
  MemorySearchResult,
  MemoryListFactsInput,
  MemoryListFactsResult,
  MemoryCreateFactInput,
  MemoryUpdateFactInput,
  MemoryBatchUpdateFactsInput,
  MemoryBatchDeleteFactsInput,
  MemoryFactHistoryItem,
  MemoryFactHistory,
  MemoryFeedbackInput,
  MemoryFeedbackResult,
  MemoryGraphQueryInput,
  MemoryGraphEntity,
  MemoryGraphRelation,
  MemoryGraphEvidenceSummary,
  MemoryGraphQueryResult,
  MemoryGraphObservation,
  MemoryEntityDetailInput,
  MemoryEntityDetail,
  MemoryExportResult,
  MemoryExportData,
} from './memory';

export type {
  AutomationJob,
  AutomationRunRecord,
  AutomationCreateInput,
  AutomationCreateSourceInput,
  AutomationJobIdInput,
  AutomationToggleInput,
  AutomationListRunsInput,
  AutomationStatusChangeEvent,
} from './automations';

export type {
  DesktopApi,
  MembershipAccessSessionPayload,
  MembershipAuthResult,
  MembershipAuthUser,
  MembershipRefreshSessionResult,
  PersistedDocumentSession,
  PersistedTab,
} from './desktop-api';

export type {
  SandboxAuthRequest,
  SandboxAuthResponse,
  SandboxSettings,
  SandboxApi,
} from './sandbox';

export type {
  Site,
  SiteType,
  SiteStatus,
  PublishFile,
  PublishPage,
  NavItem,
  PublishSiteInput,
  PublishResult,
  BuildSiteInput,
  BuildProgressEvent,
  BuildSiteResult,
  SubdomainCheckResult,
  SubdomainSuggestResult,
  CreateSiteInput,
  UpdateSiteInput,
  LocalSiteBinding,
} from './site-publish';

export type {
  SearchQueryInput,
  SearchQueryResult,
  SearchFileHit,
  SearchThreadHit,
  SearchStatus,
  SearchRebuildResult,
} from './search';

export type {
  TelegramAccountMode,
  TelegramDmPolicy,
  TelegramGroupPolicy,
  TelegramGroupTopicRule,
  TelegramGroupRule,
  TelegramAccountSnapshot,
  TelegramSettingsSnapshot,
  TelegramSettingsUpdateInput,
  TelegramRuntimeAccountStatus,
  TelegramRuntimeStatusSnapshot,
  TelegramPairingRequestItem,
  TelegramProxyTestInput,
  TelegramProxyTestResult,
  TelegramProxySuggestionInput,
  TelegramProxySuggestionReason,
  TelegramProxySuggestionResult,
  TelegramKnownChat,
} from './telegram';
