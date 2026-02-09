/**
 * [PROVIDES]: DesktopWorkspace - Workspace feature public entry
 * [DEPENDS]: WorkspaceControllerProvider, DesktopWorkspaceShell
 * [POS]: 作为 App Root 渲染的顶层工作区组件（内部调用 hooks，不再通过巨型 props 透传）
 */

import { WorkspaceControllerProvider } from './context';
import { DesktopWorkspaceShell } from './desktop-workspace-shell';

export const DesktopWorkspace = () => {
  return (
    <WorkspaceControllerProvider>
      <DesktopWorkspaceShell />
    </WorkspaceControllerProvider>
  );
};
