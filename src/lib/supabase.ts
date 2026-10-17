import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { DecryptedMessage, LocalIdentity, UserProfile } from '../types/chat.ts';

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_ANON_KEY || 'missing-key',
  {
    realtime: {
      params: { eventsPerSecond: 20 },
    },
  }
);

// ----------------------------------------------------------------- simple user login

export async function joinAsUser(
  rawUsername: string,
  rawDisplayName: string
): Promise<{ user: LocalIdentity | null; error: string | null }> {
  const username = rawUsername.trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9_]/g, '');
  if (!username) {
    return { user: null, error: 'Please choose a valid username.' };
  }

  const displayName = rawDisplayName.trim() || username;

  try {
    // Check if user already exists
    const existing = await fetchProfileByUsername(username);
    if (existing) {
      // User exists - log straight into this profile
      await touchLastSeen(existing.userId);
      const user: LocalIdentity = {
        userId: existing.userId,
        username: existing.username,
        displayName: existing.displayName,
        createdAt: Date.now(),
      };
      return { user, error: null };
    }

    // New user - create profile
    const userId = `u_${username}`;
    const { error: insertError } = await supabase.from('profiles').insert([
      {
        id: userId,
        username,
        display_name: displayName,
        last_seen: Date.now(),
      },
    ]);

    if (insertError) {
      // If race condition where username was inserted simultaneously, fetch it
      const fallback = await fetchProfileByUsername(username);
      if (fallback) {
        return {
          user: {
            userId: fallback.userId,
            username: fallback.username,
            displayName: fallback.displayName,
            createdAt: Date.now(),
          },
          error: null,
        };
      }
      return { user: null, error: insertError.message };
    }

    const newUser: LocalIdentity = {
      userId,
      username,
      displayName,
      createdAt: Date.now(),
    };

    return { user: newUser, error: null };
  } catch (err) {
    return { user: null, error: (err as Error).message || 'Could not connect to database.' };
  }
}

// ----------------------------------------------------------------- profiles

function rowToProfile(row: any): UserProfile {
  return {
    userId: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
  };
}

export async function fetchProfileByUsername(
  username: string
): Promise<UserProfile | null> {
  const clean = username.trim().toLowerCase().replace(/^@+/, '');
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('username', clean)
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return rowToProfile(data[0]);
}

export async function fetchProfileById(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('id', userId)
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return rowToProfile(data[0]);
}

export async function searchProfiles(
  query: string,
  excludeUserId?: string
): Promise<UserProfile[]> {
  const q = query.trim().toLowerCase().replace(/^@+/, '');
  if (!q) return [];

  let builder = supabase
    .from('profiles')
    .select('id, username, display_name')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(10);

  if (excludeUserId) {
    builder = builder.neq('id', excludeUserId);
  }

  const { data, error } = await builder;
  if (error || !data) return [];
  return data.map(rowToProfile);
}

export async function touchLastSeen(userId: string): Promise<void> {
  try {
    await supabase.from('profiles').update({ last_seen: Date.now() }).eq('id', userId);
  } catch {
    // ignore
  }
}

export async function deleteOwnAccount(userId: string): Promise<void> {
  try {
    await supabase
      .from('conversations')
      .delete()
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);
    await supabase.from('profiles').delete().eq('id', userId);
  } catch {
    // ignore
  }
}

// ------------------------------------------------------------ conversations

export interface ConversationRow {
  chatId: string;
  userA: string;
  userB: string;
  updatedAt: number;
}

export async function upsertConversation(row: ConversationRow): Promise<void> {
  const { error } = await supabase.from('conversations').upsert(
    {
      chat_id: row.chatId,
      user_a: row.userA,
      user_b: row.userB,
      updated_at: row.updatedAt,
    },
    { onConflict: 'chat_id' }
  );
  if (error) throw new Error(error.message);
}

export async function touchConversation(chatId: string, updatedAt: number): Promise<void> {
  try {
    await supabase.from('conversations').update({ updated_at: updatedAt }).eq('chat_id', chatId);
  } catch {
    // ignore
  }
}

export async function fetchConversations(userId: string): Promise<ConversationRow[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('chat_id, user_a, user_b, updated_at')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (error) return [];
  return (data || []).map((row) => ({
    chatId: row.chat_id,
    userA: row.user_a,
    userB: row.user_b,
    updatedAt: Number(row.updated_at),
  }));
}

export async function deleteConversation(chatId: string): Promise<void> {
  await supabase.from('direct_messages').delete().eq('chat_id', chatId);
  await supabase.from('conversations').delete().eq('chat_id', chatId);
}

// ---------------------------------------------------------------- messages

export async function fetchMessages(
  chatId: string,
  options: { before?: number; limit?: number } = {}
): Promise<DecryptedMessage[]> {
  const limit = options.limit ?? 100;
  let query = supabase
    .from('direct_messages')
    .select('id, chat_id, sender_id, content, payload, reply_to_id, timestamp')
    .eq('chat_id', chatId);

  if (options.before) query = query.lt('timestamp', options.before);

  const { data, error } = await query
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) return [];

  return (data || [])
    .map((row) => {
      const text = row.content || (row.payload && typeof row.payload === 'object' ? row.payload.text || '' : '') || '';
      return {
        id: row.id,
        chatId: row.chat_id,
        senderId: row.sender_id,
        content: text,
        replyToId: row.reply_to_id,
        timestamp: Number(row.timestamp),
        status: 'read' as const,
        reactions: {},
      };
    })
    .reverse();
}

export async function persistMessage(msg: {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  replyToId?: string;
  timestamp: number;
}): Promise<void> {
  const { error } = await supabase.from('direct_messages').insert([
    {
      id: msg.id,
      chat_id: msg.chatId,
      sender_id: msg.senderId,
      sender_name: '',
      type: 'text',
      content: msg.content,
      payload: { text: msg.content },
      reply_to_id: msg.replyToId,
      timestamp: msg.timestamp,
    },
  ]);
  if (error) throw new Error(error.message);
}

// --------------------------------------------------------------- reactions

export async function fetchReactions(
  chatId: string
): Promise<Array<{ messageId: string; username: string; emoji: string }>> {
  const { data, error } = await supabase
    .from('message_reactions')
    .select('message_id, username, emoji')
    .eq('chat_id', chatId);

  if (error) return [];
  return (data || []).map((row) => ({
    messageId: row.message_id,
    username: row.username,
    emoji: row.emoji,
  }));
}

export async function addReaction(
  messageId: string,
  chatId: string,
  userId: string,
  username: string,
  emoji: string
): Promise<void> {
  await supabase.from('message_reactions').insert([
    { message_id: messageId, chat_id: chatId, user_id: userId, username, emoji },
  ]);
}

export async function removeReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> {
  await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji);
}

// --------------------------------------------------------------- read state

export async function fetchReadStates(
  chatId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('chat_reads')
    .select('user_id, last_read_at')
    .eq('chat_id', chatId);

  if (error) return {};
  const out: Record<string, number> = {};
  for (const row of data || []) out[row.user_id] = Number(row.last_read_at);
  return out;
}

export async function markRead(
  chatId: string,
  userId: string,
  at: number
): Promise<void> {
  await supabase.from('chat_reads').upsert(
    { chat_id: chatId, user_id: userId, last_read_at: at },
    { onConflict: 'chat_id,user_id' }
  );
}

// ---------------------------------------------------------------- realtime

export interface ChatSubscription {
  channel: RealtimeChannel;
  broadcastMessage: (message: DecryptedMessage) => Promise<void>;
  broadcastTyping: (userId: string, username: string, isTyping: boolean) => Promise<void>;
  broadcastReaction: (payload: {
    targetMessageId: string;
    emoji: string;
    username: string;
  }) => Promise<void>;
  broadcastReadReceipt: (readByUserId: string, at: number) => Promise<void>;
  broadcastChatDeleted: () => Promise<void>;
  leave: () => void;
}

export function setupChatChannel(
  chatId: string,
  userId: string,
  username: string,
  handlers: {
    onMessage: (message: DecryptedMessage) => void;
    onTyping: (payload: { userId: string; username: string; isTyping: boolean }) => void;
    onReaction: (payload: {
      targetMessageId: string;
      emoji: string;
      username: string;
    }) => void;
    onReadReceipt: (payload: { readByUserId: string; at: number }) => void;
    onChatDeleted: () => void;
    onPresenceChange: (activeParticipants: { userId: string; username: string }[]) => void;
  }
): ChatSubscription {
  const channel = supabase.channel(`tg-chat:${chatId}`, {
    config: {
      broadcast: { self: false },
      presence: { key: userId },
    },
  });

  const collectParticipants = () => {
    const state = channel.presenceState();
    const participants: { userId: string; username: string }[] = [];
    for (const key in state) {
      const presences = state[key] as any[];
      if (presences && presences[0]) {
        participants.push({
          userId: presences[0].userId || key,
          username: presences[0].username || 'Friend',
        });
      }
    }
    handlers.onPresenceChange(participants);
  };

  channel
    .on('broadcast', { event: 'message' }, (payload) => {
      if (payload.payload) handlers.onMessage(payload.payload as DecryptedMessage);
    })
    .on('broadcast', { event: 'typing' }, (payload) => {
      if (payload.payload) handlers.onTyping(payload.payload);
    })
    .on('broadcast', { event: 'reaction' }, (payload) => {
      if (payload.payload) handlers.onReaction(payload.payload);
    })
    .on('broadcast', { event: 'read_receipt' }, (payload) => {
      if (payload.payload) handlers.onReadReceipt(payload.payload);
    })
    .on('broadcast', { event: 'chat_deleted' }, () => handlers.onChatDeleted())
    .on('presence', { event: 'sync' }, collectParticipants)
    .on('presence', { event: 'join' }, collectParticipants)
    .on('presence', { event: 'leave' }, collectParticipants);

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        userId,
        username,
        joinedAt: new Date().toISOString(),
      });
    }
  });

  return {
    channel,
    broadcastMessage: async (message) => {
      await channel.send({ type: 'broadcast', event: 'message', payload: message });
    },
    broadcastTyping: async (uid, uname, isTyping) => {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: uid, username: uname, isTyping },
      });
    },
    broadcastReaction: async (payload) => {
      await channel.send({ type: 'broadcast', event: 'reaction', payload });
    },
    broadcastReadReceipt: async (readByUserId, at) => {
      await channel.send({
        type: 'broadcast',
        event: 'read_receipt',
        payload: { readByUserId, at },
      });
    },
    broadcastChatDeleted: async () => {
      await channel.send({
        type: 'broadcast',
        event: 'chat_deleted',
        payload: { timestamp: Date.now() },
      });
    },
    leave: () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    },
  };
}

export function setupInboxChannel(
  userId: string,
  handlers: {
    onConversation: () => void;
    onMessage: (chatId: string) => void;
  }
): RealtimeChannel {
  const channel = supabase
    .channel(`tg-inbox:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'conversations' },
      () => handlers.onConversation()
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'direct_messages' },
      (payload) => {
        const chatId = (payload.new as { chat_id?: string })?.chat_id;
        if (chatId) handlers.onMessage(chatId);
      }
    );

  channel.subscribe();
  return channel;
}
