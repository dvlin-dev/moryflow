/**
 * [DEFINES]: Navigation menu configuration
 * [USED_BY]: Header.tsx
 * [POS]: 导航菜单配置 - Developers 下拉面板数据
 */

import { Globe, Database, BookOpen, Code, Settings } from 'lucide-react';

export interface NavMenuItem {
  icon: typeof Globe;
  title: string;
  description: string;
  href: string;
  internal: boolean;
}

// Developers 面板 - 产品列表
export const DEVELOPER_PRODUCTS: NavMenuItem[] = [
  {
    icon: Globe,
    title: 'Fetchx',
    description: 'Web scraping & data extraction API',
    href: '/fetchx',
    internal: true,
  },
  {
    icon: Database,
    title: 'Memox',
    description: 'Long-term memory for AI applications',
    href: '/memox',
    internal: true,
  },
];

// Developers 面板 - 资源列表
export const DEVELOPER_RESOURCES: NavMenuItem[] = [
  {
    icon: BookOpen,
    title: 'Documentation',
    description: 'API references and guides',
    href: 'https://docs.anyhunt.app',
    internal: false,
  },
  {
    icon: Code,
    title: 'API Reference',
    description: 'OpenAPI specs and playground',
    href: 'https://server.anyhunt.app/api-docs',
    internal: false,
  },
  {
    icon: Settings,
    title: 'Console',
    description: 'Manage API keys & usage',
    href: 'https://console.anyhunt.app',
    internal: false,
  },
];
