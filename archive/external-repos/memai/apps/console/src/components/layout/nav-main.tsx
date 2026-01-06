/**
 * NavMain - 主导航组件（支持二级菜单）
 * 基于 shadcn sidebar collapsible 模式
 */
import { useLocation, Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@memai/ui/primitives'

/** 子菜单项 */
export interface NavSubItem {
  title: string
  url: string
}

/** 导航项（支持子菜单） */
export interface NavItem {
  title: string
  url?: string
  icon: LucideIcon
  items?: NavSubItem[]
}

/** 导航分组 */
export interface NavGroup {
  label?: string
  items: NavItem[]
}

export interface NavMainProps {
  groups: NavGroup[]
}

export function NavMain({ groups }: NavMainProps) {
  const location = useLocation()

  // 检查路由是否激活
  const isActive = (url: string) => {
    if (url === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(url)
  }

  // 检查分组是否有激活的子项
  const hasActiveChild = (items?: NavSubItem[]) => {
    if (!items) return false
    return items.some((item) => isActive(item.url))
  }

  return (
    <>
      {groups.map((group, groupIndex) => (
        <SidebarGroup key={groupIndex}>
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarMenu>
            {group.items.map((item) => {
              // 有子菜单的项目 - 使用 Collapsible
              if (item.items && item.items.length > 0) {
                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={hasActiveChild(item.items)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          <item.icon />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActive(subItem.url)}
                              >
                                <Link to={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              }

              // 无子菜单的项目 - 直接链接
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={item.url ? isActive(item.url) : false}
                  >
                    <Link to={item.url || '#'}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}
