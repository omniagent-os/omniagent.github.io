import { type Provider, type SynergyMode, type AppSettings, type Conversation } from './types';
import { defaultProviders } from './providers';

const SETTINGS_KEY = 'omniagent_settings';
const CONVERSATIONS_KEY = 'omniagent_conversations';

export const defaultSettings: AppSettings = {
  providers: defaultProviders,
  synergyMode: 'quality',
  theme: 'dark',
  synthesisProvider: 'openai',
  backendUrl: '',
};

export function getSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return defaultSettings;
    
    const parsed = JSON.parse(saved);
    // Merge saved settings with default providers to ensure we have all required fields and new providers
    return {
      ...defaultSettings,
      ...parsed,
      providers: defaultProviders.map(dp => {
        const savedProvider = parsed.providers?.find((p: Provider) => p.id === dp.id);
        if (savedProvider) {
          return { ...dp, ...savedProvider };
        }
        return dp;
      })
    };
  } catch (e) {
    console.error('Failed to load settings:', e);
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function getConversations(): Conversation[] {
  try {
    const saved = localStorage.getItem(CONVERSATIONS_KEY);
    if (!saved) return [];
    return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load conversations:', e);
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.error('Failed to save conversations:', e);
  }
}

export function saveConversation(conversation: Conversation): void {
  const conversations = getConversations();
  const index = conversations.findIndex(c => c.id === conversation.id);
  
  if (index >= 0) {
    conversations[index] = conversation;
  } else {
    conversations.unshift(conversation);
  }
  
  saveConversations(conversations);
}

export function deleteConversation(id: string): void {
  const conversations = getConversations();
  saveConversations(conversations.filter(c => c.id !== id));
}

export function clearConversations(): void {
  localStorage.removeItem(CONVERSATIONS_KEY);
}
