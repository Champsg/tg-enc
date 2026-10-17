/**
 * Local cache for user session and chat summaries.
 */

import { normalizeUsername } from '../crypto/crypto.ts';
import type { ConversationRow } from './supabase.ts';
import type { ChatSummary, LocalIdentity, UserProfile } from '../types/chat.ts';

const IDENTITY_KEY = 'tg-app.identity.v4';
const CHATS_KEY = 'tg-app.chats.v4';

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function loadIdentity(authUserId: string | null): LocalIdentity | null {
  const identity = readJson<LocalIdentity>(IDENTITY_KEY);
  if (!identity?.userId || !identity.username) return null;
  if (authUserId && identity.userId !== authUserId) return null;
  return identity;
}

export function saveIdentity(identity: LocalIdentity) {
  writeJson(IDENTITY_KEY, identity);
}

export function clearLocalIdentity() {
  localStorage.removeItem(IDENTITY_KEY);
  localStorage.removeItem(CHATS_KEY);
}

export function loadChats(): ChatSummary[] {
  const chats = readJson<ChatSummary[]>(CHATS_KEY);
  if (!Array.isArray(chats)) return [];
  return chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function saveChats(chats: ChatSummary[]) {
  writeJson(CHATS_KEY, chats);
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

/** Rebuild chat summaries from cloud conversations plus user profiles. */
export async function mergeConversations(
  myUserId: string,
  conversations: ConversationRow[],
  cached: ChatSummary[],
  lookupProfile: (userId: string) => Promise<UserProfile | null>
): Promise<ChatSummary[]> {
  const merged: ChatSummary[] = [];

  for (const conversation of conversations) {
    const peerId =
      conversation.userA === myUserId ? conversation.userB : conversation.userA;

    const previous = cached.find((c) => c.chatId === conversation.chatId);
    const profile = await lookupProfile(peerId);

    merged.push({
      chatId: conversation.chatId,
      peerId,
      peerUsername: profile?.username || previous?.peerUsername || 'user',
      peerName: profile?.displayName || previous?.peerName || 'Friend',
      updatedAt: conversation.updatedAt || previous?.updatedAt || 0,
      lastMessage: previous?.lastMessage,
      unread: previous?.unread,
    });
  }

  return merged.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
