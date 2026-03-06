import { File, Image, Quote, Wrench } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { buildChatPromptInputViewModel } from './chat-prompt-input-view-model';

describe('buildChatPromptInputViewModel', () => {
  it('returns hidden chips row for empty state', () => {
    const viewModel = buildChatPromptInputViewModel({
      attachments: [],
      selectedSkill: null,
      selectionReference: null,
      contextFileCount: 0,
      isSpeechActive: false,
      isProcessing: false,
      formattedDuration: '00:15',
      labels: {
        imageLabel: 'Image',
        attachmentLabel: 'Attachment',
        transcribing: 'Transcribing',
      },
      removeLabels: {
        removeFile: 'Remove file',
        removeSelectedSkill: 'Remove selected skill',
        removeReference: 'Remove reference',
      },
      handlers: {
        onClearSelectedSkill: vi.fn(),
        onClearSelectionReference: vi.fn(),
        onRemoveAttachment: vi.fn(),
      },
    });

    expect(viewModel.shouldRenderChipsRow).toBe(false);
    expect(viewModel.fileChips).toHaveLength(0);
    expect(viewModel.shouldRenderContextFiles).toBe(false);
    expect(viewModel.showContentTruncatedBadge).toBe(false);
    expect(viewModel.footerLeft.mode).toBe('tools');
  });

  it('builds skill/reference/attachment chips and truncated badge', () => {
    const onClearSelectedSkill = vi.fn();
    const onClearSelectionReference = vi.fn();
    const onRemoveAttachment = vi.fn();
    const viewModel = buildChatPromptInputViewModel({
      attachments: [
        { id: 'img-1', filename: '', mediaType: 'image/png' },
        { id: 'file-1', filename: 'notes.md', mediaType: 'text/markdown' },
      ],
      selectedSkill: {
        title: 'Web Search',
        description: 'Search with external providers',
      },
      selectionReference: {
        preview: 'Selected paragraph',
        filePath: '/tmp/doc.md',
        isTruncated: true,
      },
      contextFileCount: 1,
      isSpeechActive: false,
      isProcessing: false,
      formattedDuration: '00:15',
      labels: {
        imageLabel: 'Image',
        attachmentLabel: 'Attachment',
        transcribing: 'Transcribing',
      },
      removeLabels: {
        removeFile: 'Remove file',
        removeSelectedSkill: 'Remove selected skill',
        removeReference: 'Remove reference',
      },
      handlers: {
        onClearSelectedSkill,
        onClearSelectionReference,
        onRemoveAttachment,
      },
    });

    expect(viewModel.shouldRenderChipsRow).toBe(true);
    expect(viewModel.shouldRenderContextFiles).toBe(true);
    expect(viewModel.showContentTruncatedBadge).toBe(true);
    expect(viewModel.fileChips).toHaveLength(4);
    expect(viewModel.fileChips[0]).toMatchObject({
      icon: Wrench,
      label: 'Web Search',
      tooltip: 'Search with external providers',
      removeLabel: 'Remove selected skill',
    });
    expect(viewModel.fileChips[1]).toMatchObject({
      icon: Quote,
      label: 'Selected paragraph',
      tooltip: '/tmp/doc.md',
      removeLabel: 'Remove reference',
    });
    expect(viewModel.fileChips[2]).toMatchObject({
      icon: Image,
      label: 'Image',
      removeLabel: 'Remove file',
    });
    expect(viewModel.fileChips[3]).toMatchObject({
      icon: File,
      label: 'notes.md',
      tooltip: 'notes.md',
      removeLabel: 'Remove file',
    });

    viewModel.fileChips[0].onRemove();
    viewModel.fileChips[1].onRemove();
    viewModel.fileChips[2].onRemove();
    expect(onClearSelectedSkill).toHaveBeenCalledTimes(1);
    expect(onClearSelectionReference).toHaveBeenCalledTimes(1);
    expect(onRemoveAttachment).toHaveBeenCalledWith('img-1');
  });

  it('builds speech footer view model with transcribing label', () => {
    const viewModel = buildChatPromptInputViewModel({
      attachments: [],
      selectedSkill: null,
      selectionReference: null,
      contextFileCount: 0,
      isSpeechActive: true,
      isProcessing: true,
      formattedDuration: '00:15',
      labels: {
        imageLabel: 'Image',
        attachmentLabel: 'Attachment',
        transcribing: 'Transcribing',
      },
      removeLabels: {
        removeFile: 'Remove file',
        removeSelectedSkill: 'Remove selected skill',
        removeReference: 'Remove reference',
      },
      handlers: {
        onClearSelectedSkill: vi.fn(),
        onClearSelectionReference: vi.fn(),
        onRemoveAttachment: vi.fn(),
      },
    });

    expect(viewModel.footerLeft).toEqual({
      mode: 'speech',
      durationLabel: 'Transcribing',
    });
  });
});
