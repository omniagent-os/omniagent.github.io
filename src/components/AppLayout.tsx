import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, MessageSquare, History, Settings, Menu, X, Moon, Sun } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isDark, toggleTheme } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/chat', label: 'Synergy Chat', icon: MessageSquare },
    { href: '/history', label: 'History', icon: History },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-sidebar border-r border-border
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        <div className="p-6 flex items-center justify-between">
          <Link href="/">
            <span className="font-bold text-xl tracking-tight text-foreground flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50 synergy-glow relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/20 synergy-pulse rounded-full"></div>
                <div className="w-3 h-3 rounded-full bg-primary z-10"></div>
              </div>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">OmniAgent</span>
            </span>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-4 py-2 flex-1">
          <div className="space-y-1">
            {navItems.map((item) => {
              const active = location === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`
                    flex items-center gap-3 px-3 py-2 rounded-md transition-all cursor-pointer
                    ${active 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}
                  `}>
                    <Icon className={`h-4 w-4 ${active ? 'text-primary' : ''}`} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={toggleTheme}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-14 border-b border-border bg-background/80 backdrop-blur flex items-center px-4 md:hidden z-30 sticky top-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold ml-2">OmniAgent Synergy</span>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
