import { describe, expect, it } from 'vitest';
import { resolveWorkspaceLayout } from './layout-resolver';

describe('navigation/layout-resolver', () => {
  it('agent/chat: keeps chat across all agent-only projections', () => {
    const layout = resolveWorkspaceLayout({
      destination: 'agent',
      sidebarMode: 'chat',
    });

    expect(layout).toMatchObject({
      headerMode: 'chat',
      sidebarContentMode: 'chat',
      mainViewState: 'agent-chat',
      chatPanePlacement: 'main',
      showTopTabs: false,
    });
  });

  it('agent/home: maps to home + panel + top tabs', () => {
    const layout = resolveWorkspaceLayout({
      destination: 'agent',
      sidebarMode: 'home',
    });

    expect(layout).toMatchObject({
      headerMode: 'home',
      sidebarContentMode: 'home',
      mainViewState: 'agent-home',
      chatPanePlacement: 'panel',
      showTopTabs: true,
    });
  });

  it('module destinations: always force home sidebar and parking chat pane', () => {
    expect(
      resolveWorkspaceLayout({
        destination: 'skills',
        sidebarMode: 'chat',
      })
    ).toMatchObject({
      headerMode: 'home',
      sidebarContentMode: 'home',
      mainViewState: 'skills',
      chatPanePlacement: 'parking',
      showTopTabs: false,
    });

    expect(
      resolveWorkspaceLayout({
        destination: 'sites',
        sidebarMode: 'chat',
      })
    ).toMatchObject({
      mainViewState: 'sites',
      chatPanePlacement: 'parking',
    });

    expect(
      resolveWorkspaceLayout({
        destination: 'remote-agents',
        sidebarMode: 'chat',
      })
    ).toMatchObject({
      mainViewState: 'remote-agents',
      chatPanePlacement: 'parking',
    });
  });

  it('accepts navigation view input for module destination', () => {
    const layout = resolveWorkspaceLayout({
      destination: 'sites',
      sidebarMode: 'chat',
    });

    expect(layout).toMatchObject({
      destination: 'sites',
      sidebarMode: 'home',
      mainViewState: 'sites',
      chatPanePlacement: 'parking',
    });
  });
});
