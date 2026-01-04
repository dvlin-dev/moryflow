import type { ActiveDocument, RequestState, SelectedFile } from '../../const'
import type { Site } from '../../../../shared/ipc/site-publish'

/** 重命名结果 */
export type RenameResult = {
  /** 新的文件路径 */
  path: string
  /** 新的文件名 */
  name: string
}

export type EditorPanelProps = {
  activeDoc: ActiveDocument | null
  selectedFile: SelectedFile | null
  docState: RequestState
  docError: string | null
  /** 当前 Vault 是否有文件 */
  hasFiles?: boolean
  /** Chat 面板是否收起 */
  chatCollapsed?: boolean
  /** 当前文件已发布的站点信息 */
  publishedSite?: Site
  onEditorChange: (markdown: string) => void
  onRetryLoad: () => void
  /** 重命名文件回调，返回新路径和新文件名 */
  onRename: (path: string, newName: string) => Promise<RenameResult>
  /** 切换 Chat 面板展开/收起 */
  onToggleChat?: () => void
  /** 发布成功回调 */
  onPublished?: (site: Site) => void
  /** 导航到 Sites 页面 */
  onNavigateToSites?: () => void
}
