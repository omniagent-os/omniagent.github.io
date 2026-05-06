import type { Conversation } from './types';

export function encodeConversation(conv: Conversation): string {
  const json = JSON.stringify({
    id: conv.id,
    title: conv.title,
    messages: conv.messages,
    modelsUsed: conv.modelsUsed,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
  });
  return btoa(encodeURIComponent(json));
}

export function decodeConversation(hash: string): Conversation | null {
  try {
    const json = decodeURIComponent(atob(hash));
    return JSON.parse(json) as Conversation;
  } catch {
    return null;
  }
}

export function buildShareUrl(conv: Conversation): string {
  const encoded = encodeConversation(conv);
  const base = window.location.origin + window.location.pathname.replace(/\/chat.*$/, '');
  return `${base}/share#${encoded}`;
}

export async function copyShareUrl(conv: Conversation): Promise<boolean> {
  try {
    const url = buildShareUrl(conv);
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
