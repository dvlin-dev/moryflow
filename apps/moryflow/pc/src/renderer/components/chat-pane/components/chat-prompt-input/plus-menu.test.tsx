import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatPromptInputPlusMenu } from './plus-menu';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('./skill-panel', () => ({
  SkillPanel: () => <div>skill-panel</div>,
}));

vi.mock('./file-context-panel', () => ({
  FileContextPanel: () => <div>file-context-panel</div>,
}));

vi.mock('./mcp-panel', () => ({
  McpPanel: () => <div>mcp-panel</div>,
}));

describe('ChatPromptInputPlusMenu', () => {
  it('renders MCP submenu inside plus menu', () => {
    render(
      <ChatPromptInputPlusMenu
        disabled={false}
        onOpenFileDialog={() => undefined}
        onSelectSkill={() => undefined}
        onAddContextFile={() => undefined}
      />
    );

    fireEvent.pointerDown(screen.getByLabelText('openPlusMenu'));

    expect(screen.getByText('uploadFiles')).toBeTruthy();
    expect(screen.getByText('skillsMenu')).toBeTruthy();
    expect(screen.getByText('mcpMenu')).toBeTruthy();
    expect(screen.getByText('referenceFiles')).toBeTruthy();
  });
});
