'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './sidebar';
import { Header } from './header';

const STORAGE_KEY = 'benchmodel:sidebar-collapsed';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const qc = useQueryClient();
  const bootstrapped = useRef(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === '1') setCollapsed(true);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    fetch('/api/bootstrap', { method: 'POST' })
      .then((r) => r.json())
      .then((data: { seededProvider?: boolean; seededCollection?: boolean }) => {
        if (data.seededProvider) qc.invalidateQueries({ queryKey: ['providers'] });
        if (data.seededCollection) qc.invalidateQueries({ queryKey: ['collections'] });
      })
      .catch(() => {
        // bootstrap is best effort, ignore failures
      });
  }, [qc]);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} />
      <div className="flex flex-1 flex-col">
        <Header onToggleSidebar={toggle} sidebarCollapsed={collapsed} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
