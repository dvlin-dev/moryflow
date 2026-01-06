/**
 * [PROPS]: { onSearch, onOpenAI, onSites }
 * [EMITS]: onSearch, onOpenAI, onSites - 导航按钮点击事件
 * [POS]: 侧边栏功能导航区组件
 */

import { Search, Sparkles, Globe } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import type { SidebarNavProps } from '../const'

type NavItemProps = {
  icon: React.ElementType
  label: string
  onClick: () => void
}

const NavItem = ({ icon: Icon, label, onClick }: NavItemProps) => (
  <button
    type="button"
    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
    onClick={onClick}
  >
    <Icon className="size-4 shrink-0" />
    <span className="truncate">{label}</span>
  </button>
)

export const SidebarNav = ({ onSearch, onOpenAI, onSites }: SidebarNavProps) => {
  const { t } = useTranslation('workspace')

  return (
    <nav className="shrink-0 space-y-0.5 px-2 py-2">
      <NavItem icon={Search} label={t('search')} onClick={onSearch} />
      <NavItem icon={Sparkles} label="Mory AI" onClick={onOpenAI} />
      <NavItem icon={Globe} label="Sites" onClick={onSites} />
    </nav>
  )
}
