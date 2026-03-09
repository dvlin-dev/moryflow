import type { Locale } from '@/lib/i18n';
import { t } from '@/lib/i18n';

export type WorkspaceDemoSidebarMode = 'home' | 'chat';

export type WorkspaceDemoFile = {
  id: string;
  title: string;
  subtitle: string;
};

export type WorkspaceDemoMessage =
  | {
      id: string;
      role: 'user' | 'assistant';
      kind: 'text';
      content: string;
    }
  | {
      id: string;
      role: 'assistant';
      kind: 'tool-step';
      content: string;
    };

export type WorkspaceDemoContent = {
  sidebarFiles: WorkspaceDemoFile[];
  documentTitle: string;
  documentBody: string;
  defaultMessages: WorkspaceDemoMessage[];
  followUpReply: string;
  homeLabel: string;
  chatLabel: string;
  documentsLabel: string;
  newChatLabel: string;
  editorDescription: string;
  editorOpenDocumentLabel: string;
  chatTitle: string;
  chatSubtitle: string;
  chatAskModeLabel: string;
  chatToolLabel: string;
  chatUserRoleLabel: string;
  chatAssistantRoleLabel: string;
  chatPreviewLabel: string;
  chatInputLabel: string;
  chatPlaceholder: string;
  chatContinueHint: string;
  chatSendLabel: string;
  chatSendAriaLabel: string;
};

export function getWorkspaceDemoContent(locale: Locale): WorkspaceDemoContent {
  const documentTitle = t('home.heroDemo.documentTitle', locale);

  return {
    sidebarFiles: [
      {
        id: 'introducing-moryflow',
        title: documentTitle,
        subtitle: t('home.heroDemo.documentSubtitle', locale),
      },
    ],
    documentTitle,
    documentBody: t('home.heroDemo.documentBody', locale),
    defaultMessages: [
      {
        id: 'intro-user',
        role: 'user',
        kind: 'text',
        content: t('home.heroDemo.message.userPrompt', locale),
      },
      {
        id: 'intro-tool-search',
        role: 'assistant',
        kind: 'tool-step',
        content: t('home.heroDemo.message.toolSearch', locale),
      },
      {
        id: 'intro-tool-collect',
        role: 'assistant',
        kind: 'tool-step',
        content: t('home.heroDemo.message.toolCollect', locale),
      },
      {
        id: 'intro-tool-write',
        role: 'assistant',
        kind: 'tool-step',
        content: t('home.heroDemo.message.toolWrite', locale),
      },
      {
        id: 'intro-assistant',
        role: 'assistant',
        kind: 'text',
        content: t('home.heroDemo.message.assistantSummary', locale),
      },
    ],
    followUpReply: t('home.heroDemo.message.followUpReply', locale),
    homeLabel: t('home.heroDemo.homeLabel', locale),
    chatLabel: t('home.heroDemo.chatLabel', locale),
    documentsLabel: t('home.heroDemo.documentsLabel', locale),
    newChatLabel: t('home.heroDemo.newChatLabel', locale),
    editorDescription: t('home.heroDemo.editorDescription', locale),
    editorOpenDocumentLabel: t('home.heroDemo.editorOpenDocumentLabel', locale),
    chatTitle: t('home.heroDemo.chatTitle', locale),
    chatSubtitle: t('home.heroDemo.chatSubtitle', locale),
    chatAskModeLabel: t('home.heroDemo.chatAskModeLabel', locale),
    chatToolLabel: t('home.heroDemo.chatToolLabel', locale),
    chatUserRoleLabel: t('home.heroDemo.chatUserRoleLabel', locale),
    chatAssistantRoleLabel: t('home.heroDemo.chatAssistantRoleLabel', locale),
    chatPreviewLabel: t('home.heroDemo.chatPreviewLabel', locale),
    chatInputLabel: t('home.heroDemo.chatInputLabel', locale),
    chatPlaceholder: t('home.heroDemo.chatPlaceholder', locale),
    chatContinueHint: t('home.heroDemo.chatContinueHint', locale),
    chatSendLabel: t('home.heroDemo.chatSendLabel', locale),
    chatSendAriaLabel: t('home.heroDemo.chatSendAriaLabel', locale),
  };
}
