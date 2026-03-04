/**
 * [DEFINES]: 渠道抽象协议（envelope / policy / thread / outbound）
 * [USED_BY]: @moryflow/channels-telegram, pc/main 渠道装配层
 * [POS]: 跨渠道共享事实源类型定义
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

export type ChannelKind = 'telegram';

export type PeerType = 'private' | 'group' | 'supergroup' | 'channel' | 'unknown';

export type InboundEventKind = 'message' | 'channel_post' | 'callback_query' | 'message_reaction';

export type InboundPeer = {
  id: string;
  type: PeerType;
  title?: string;
  username?: string;
};

export type InboundSender = {
  id: string;
  username?: string;
  isBot?: boolean;
};

export type InboundMessage = {
  text?: string;
  callbackData?: string;
  hasMention?: boolean;
  threadId?: string;
  messageId?: string;
};

export type InboundEnvelope = {
  channel: ChannelKind;
  accountId: string;
  eventId: string;
  eventKind: InboundEventKind;
  occurredAt: string;
  peer: InboundPeer;
  sender?: InboundSender;
  message: InboundMessage;
  raw: unknown;
};

export type OutboundMessageFormat = 'text' | 'html';

export type OutboundPreviewTransport = 'auto' | 'draft' | 'message';

export type OutboundPreviewAction = 'update' | 'commit' | 'clear';

export type OutboundPreviewDelivery = {
  mode: 'preview';
  action: OutboundPreviewAction;
  streamId: string;
  revision: number;
  draftId?: number;
  transport?: OutboundPreviewTransport;
};

export type OutboundFinalDelivery = {
  mode: 'final';
};

export type OutboundMessageDelivery = OutboundPreviewDelivery | OutboundFinalDelivery;

export type OutboundTarget = {
  chatId: string;
  threadId?: string;
};

export type OutboundMessage = {
  text: string;
  format?: OutboundMessageFormat;
  disableWebPagePreview?: boolean;
  delivery?: OutboundMessageDelivery;
};

export type OutboundEnvelope = {
  channel: ChannelKind;
  accountId: string;
  target: OutboundTarget;
  message: OutboundMessage;
  idempotencyKey?: string;
};

export type DmPolicy = 'pairing' | 'allowlist' | 'open' | 'disabled';
export type GroupPolicy = 'allowlist' | 'open' | 'disabled';

export type GroupTopicPolicy = {
  requireMention?: boolean;
};

export type GroupPolicyConfig = {
  requireMention?: boolean;
  topics?: Record<string, GroupTopicPolicy>;
};

export type ChannelPolicyConfig = {
  dmPolicy: DmPolicy;
  allowFrom: string[];
  groupPolicy: GroupPolicy;
  groupAllowFrom: string[];
  requireMentionByDefault: boolean;
  groups?: Record<string, GroupPolicyConfig>;
};

export type PolicyDecisionReason =
  | 'allow'
  | 'pairing_required'
  | 'dm_disabled'
  | 'dm_allowlist_denied'
  | 'group_disabled'
  | 'group_allowlist_denied'
  | 'group_mention_required'
  | 'sender_missing';

export type PolicyDecision = {
  allowed: boolean;
  requiresPairing: boolean;
  reason: PolicyDecisionReason;
};

export type ThreadResolution = {
  peerKey: string;
  threadKey: string;
  sessionKey: string;
};

export type DeliveryFailureClass =
  | 'retryable'
  | 'fallback_plaintext'
  | 'fallback_threadless'
  | 'non_retryable';

export type PairingRequestStatus = 'pending' | 'approved' | 'denied' | 'expired';

export type PairingRequest = {
  id: string;
  channel: ChannelKind;
  accountId: string;
  senderId: string;
  peerId: string;
  code: string;
  status: PairingRequestStatus;
  meta?: Record<string, unknown>;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
};
