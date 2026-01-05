/**
 * [PROPS]: { tabs, activePath, saveState, onSelect, onClose }
 * [EMITS]: onSelect, onClose - Tab 操作事件
 * [POS]: 顶栏 Tab 列表
 */

import type { SaveState, SelectedFile } from '@/workspace/const'
import { TabItem } from './tab-item'

type TabListProps = {
  tabs: SelectedFile[]
  activePath: string | null
  saveState: SaveState
  onSelect: (tab: SelectedFile) => void
  onClose: (path: string) => void
}

export const TabList = ({
  tabs,
  activePath,
  saveState,
  onSelect,
  onClose,
}: TabListProps) => {
  return (
    <div className="flex h-full items-center overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.path === activePath
        const showSaveIndicator = isActive && saveState !== 'idle'

        return (
          <TabItem
            key={tab.path}
            tab={tab}
            isActive={isActive}
            showSaveIndicator={showSaveIndicator}
            saveState={saveState}
            onSelect={() => onSelect(tab)}
            onClose={() => onClose(tab.path)}
          />
        )
      })}
    </div>
  )
}
