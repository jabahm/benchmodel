'use client';

import Link from 'next/link';
import { Github, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeaderSearch } from './header-search';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export function Header({ onToggleSidebar, sidebarCollapsed }: HeaderProps) {
  const Icon = sidebarCollapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden md:inline-flex"
      >
        <Icon className="h-5 w-5" />
        <span className="sr-only">
          {sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        </span>
      </Button>
      <HeaderSearch />
      <div className="flex flex-1 justify-end">
        <Button variant="ghost" size="sm" asChild>
          <Link href="https://github.com/benchmodel/benchmodel" target="_blank" rel="noreferrer">
            <Github className="mr-2 h-4 w-4" />
            GitHub
          </Link>
        </Button>
      </div>
    </header>
  );
}
