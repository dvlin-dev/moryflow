/**
 * 侧边栏组件
 */
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, ShoppingCart, Coins, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { to: '/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/credits', icon: Coins, label: 'Credits' },
  { to: '/logs', icon: ScrollText, label: 'Admin Logs' },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-sidebar-border bg-sidebar-background">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <span className="text-lg font-semibold text-sidebar-foreground">Aiget Admin</span>
      </div>
      <nav className="p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
