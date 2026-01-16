/**
 * NavMain - 主导航组件（支持二级菜单）
 * 基于 shadcn sidebar collapsible 模式
 */
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { useLocation, Link } from 'react-router-dom';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Icon,
  type HugeIcon,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@anyhunt/ui';

/** 子菜单项 */
export interface NavSubItem {
  title: string;
  url: string;
  external?: boolean;
}

/** 导航项（支持子菜单） */
export interface NavItem {
  title: string;
  url?: string;
  icon: HugeIcon;
  items?: NavSubItem[];
  external?: boolean;
}

/** 导航分组 */
export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export interface NavMainProps {
  groups: NavGroup[];
}

export function NavMain({ groups }: NavMainProps) {
  const location = useLocation();

  // 检查路由是否激活
  const isActive = (url: string) => {
    if (url === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(url);
  };

  // 检查分组是否有激活的子项
  const hasActiveChild = (items?: NavSubItem[]) => {
    if (!items) return false;
    return items.some((item) => isActive(item.url));
  };

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
                          <Icon icon={item.icon} className="size-4" />
                          <span>{item.title}</span>
                          <Icon
                            icon={ArrowRight01Icon}
                            className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
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
                );
              }

              // 无子菜单的项目 - 直接链接
              const LinkComponent = item.external ? (
                <a href={item.url || '#'} target="_blank" rel="noopener noreferrer">
                  <Icon icon={item.icon} className="size-4" />
                  <span>{item.title}</span>
                </a>
              ) : (
                <Link to={item.url || '#'}>
                  <Icon icon={item.icon} className="size-4" />
                  <span>{item.title}</span>
                </Link>
              );

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={item.url && !item.external ? isActive(item.url) : false}
                  >
                    {LinkComponent}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
