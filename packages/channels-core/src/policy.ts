/**
 * [INPUT]: InboundEnvelope + ChannelPolicyConfig + pairing 授权查询
 * [OUTPUT]: PolicyDecision（允许/拒绝/需配对）
 * [POS]: 渠道权限统一判定（DM/Group/mention）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { ChannelPolicyConfig, InboundEnvelope, PolicyDecision } from './types';

type PolicyRuntime = {
  config: ChannelPolicyConfig;
  hasApprovedDmSender: (senderId: string) => Promise<boolean>;
};

const normalizeId = (value: string): string => value.trim();

const toIdSet = (values: string[]): Set<string> => {
  const next = new Set<string>();
  for (const value of values) {
    const normalized = normalizeId(value);
    if (normalized.length > 0) {
      next.add(normalized);
    }
  }
  return next;
};

const resolveRequireMention = (input: {
  config: ChannelPolicyConfig;
  chatId: string;
  threadId?: string;
}): boolean => {
  const group = input.config.groups?.[input.chatId];
  const topic = input.threadId ? group?.topics?.[input.threadId] : undefined;

  if (topic?.requireMention !== undefined) {
    return topic.requireMention;
  }
  if (group?.requireMention !== undefined) {
    return group.requireMention;
  }
  return input.config.requireMentionByDefault;
};

const isGroupPeer = (type: InboundEnvelope['peer']['type']): boolean =>
  type === 'group' || type === 'supergroup' || type === 'channel';

export const evaluateInboundPolicy = async (
  runtime: PolicyRuntime,
  envelope: InboundEnvelope
): Promise<PolicyDecision> => {
  const senderId = envelope.sender?.id;

  if (envelope.peer.type === 'private') {
    const dmPolicy = runtime.config.dmPolicy;
    if (dmPolicy === 'disabled') {
      return { allowed: false, requiresPairing: false, reason: 'dm_disabled' };
    }
    if (!senderId) {
      return { allowed: false, requiresPairing: false, reason: 'sender_missing' };
    }

    if (dmPolicy === 'open') {
      return { allowed: true, requiresPairing: false, reason: 'allow' };
    }

    if (dmPolicy === 'allowlist') {
      const allowedSet = toIdSet(runtime.config.allowFrom);
      const allowed = allowedSet.has(normalizeId(senderId));
      return {
        allowed,
        requiresPairing: false,
        reason: allowed ? 'allow' : 'dm_allowlist_denied',
      };
    }

    const approved = await runtime.hasApprovedDmSender(senderId);
    if (!approved) {
      return {
        allowed: false,
        requiresPairing: true,
        reason: 'pairing_required',
      };
    }
    return {
      allowed: true,
      requiresPairing: false,
      reason: 'allow',
    };
  }

  if (!isGroupPeer(envelope.peer.type)) {
    return {
      allowed: false,
      requiresPairing: false,
      reason: 'sender_missing',
    };
  }

  const groupPolicy = runtime.config.groupPolicy;
  if (groupPolicy === 'disabled') {
    return {
      allowed: false,
      requiresPairing: false,
      reason: 'group_disabled',
    };
  }

  if (!senderId) {
    return {
      allowed: false,
      requiresPairing: false,
      reason: 'sender_missing',
    };
  }

  if (groupPolicy === 'allowlist') {
    const allowedSet = toIdSet(runtime.config.groupAllowFrom);
    if (!allowedSet.has(normalizeId(senderId))) {
      return {
        allowed: false,
        requiresPairing: false,
        reason: 'group_allowlist_denied',
      };
    }
  }

  const shouldRequireMention = resolveRequireMention({
    config: runtime.config,
    chatId: envelope.peer.id,
    threadId: envelope.message.threadId,
  });

  const mentionSensitiveEvent =
    envelope.eventKind === 'message' || envelope.eventKind === 'channel_post';
  if (shouldRequireMention && mentionSensitiveEvent && !envelope.message.hasMention) {
    return {
      allowed: false,
      requiresPairing: false,
      reason: 'group_mention_required',
    };
  }

  return {
    allowed: true,
    requiresPairing: false,
    reason: 'allow',
  };
};
