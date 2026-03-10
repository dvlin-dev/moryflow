import { describe, expect, it } from 'vitest';
import { createChatPromptOverlayStore } from './chat-prompt-overlay-store';

const noop = () => undefined;

const createSnapshot = (label: string, disabled: boolean) => ({
  isDisabled: disabled,
  atPanelOpen: false,
  setAtPanelOpen: noop,
  setAtTriggerIndex: noop,
  slashSkillPanelOpen: false,
  setSlashSkillPanelOpen: noop,
  workspaceFiles: [],
  recentFiles: [],
  contextFiles: [],
  onAddContextFileFromAt: noop,
  onRefreshFiles: noop,
  skills: [],
  onSelectSkillFromSlash: noop,
  onRefreshSkills: noop,
  labels: {
    searchDocs: label,
    recentFiles: 'Recent files',
    allFiles: 'All files',
    notFound: 'Not found',
    noOpenDocs: 'No open docs',
    allDocsAdded: 'All docs added',
    noRecentFiles: 'No recent files',
    searchSkills: 'Search skills',
    noSkillsFound: 'No skills found',
    enabledSkills: 'Enabled skills',
  },
});

describe('createChatPromptOverlayStore', () => {
  it('creates isolated overlay stores per prompt input instance', () => {
    const left = createChatPromptOverlayStore();
    const right = createChatPromptOverlayStore();

    left.getState().setSnapshot(createSnapshot('Left docs', false));
    right.getState().setSnapshot(createSnapshot('Right docs', true));

    expect(left.getState().labels.searchDocs).toBe('Left docs');
    expect(left.getState().isDisabled).toBe(false);
    expect(right.getState().labels.searchDocs).toBe('Right docs');
    expect(right.getState().isDisabled).toBe(true);
  });
});
