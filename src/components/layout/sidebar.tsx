'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FolderOpen,
  Server,
  History,
  LayoutDashboard,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './logo';

const items = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/playground', label: 'Playground', icon: Sparkles },
  { href: '/collections', label: 'Collections', icon: FolderOpen },
  { href: '/providers', label: 'Providers', icon: Server },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 self-start border-r bg-muted/40 transition-[width] duration-200 ease-out md:block',
        collapsed ? 'w-14' : 'w-60',
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b font-semibold',
          collapsed ? 'justify-center px-0' : 'px-4',
        )}
      >
        <Logo className="h-6 w-6 shrink-0" />
        {collapsed ? null : <span className="ml-2">Benchmodel</span>}
      </div>
      <nav className="flex flex-col gap-1 p-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-md text-sm transition-colors',
                collapsed ? 'h-9 w-9 justify-center self-center' : 'gap-2 px-3 py-2',
                active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {collapsed ? null : <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
