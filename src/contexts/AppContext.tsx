// @refresh reset
import React, { createContext, useContext, useState, useEffect } from 'react';
import { type AppSettings, type Provider } from '@/lib/types';
import { getSettings, saveSettings as saveSettingsToStorage } from '@/lib/storage';

interface AppContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  updateProvider: (providerId: string, updates: Partial<Provider>) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());

  useEffect(() => {
    const isDark = settings.theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveSettingsToStorage(updated);
      return updated;
    });
  };

  const updateProvider = (providerId: string, updates: Partial<Provider>) => {
    setSettings(prev => {
      const updatedProviders = prev.providers.map(p =>
        p.id === providerId ? { ...p, ...updates } : p
      );
      const updated = { ...prev, providers: updatedProviders };
      saveSettingsToStorage(updated);
      return updated;
    });
  };

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <AppContext.Provider value={{
      settings,
      updateSettings,
      updateProvider,
      isDark: settings.theme === 'dark',
      toggleTheme,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
