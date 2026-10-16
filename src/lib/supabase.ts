import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { EncryptedEnvelope } from '../types/chat.ts';

// Supabase Project Credentials provided by the user
export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  process.env.SUPABASE_URL ||
  'https://ylgegpyvnqdhvxerasdj.supabase.co';

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_G5xGPpzGzh1OU-6Kn9gLnQ_FIPzMuTF';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});

export const SQL_SETUP_SCRIPT = `-- Supabase SQL Setup for tg-enc
-- Run this in your Supabase Dashboard > SQL Editor:

create table if not exists public.secret_envelopes (
  id text primary key,
  room_id text not null,
  sender_id text not null,
  sender_name text not null,
  type text not null,
  payload jsonb,
  metadata jsonb,
  reply_to_id text,
  timestamp bigint not null,
  created_at timestamptz default now()
);

-- Create index on room_id for fast retrieval
create index if not exists idx_secret_envelopes_room_id on public.secret_envelopes(room_id, timestamp asc);

-- Enable Row Level Security (RLS)
alter table public.secret_envelopes enable row level security;

-- Allow read and insert using publishable key (all data is zero-knowledge encrypted)
create policy "Allow anon insert" on public.secret_envelopes for insert with check (true);
create policy "Allow anon select" on public.secret_envelopes for select using (true);
create policy "Allow anon delete" on public.secret_envelopes for delete using (true);
`;

/**
 * Check if the secret_envelopes table exists in Supabase
 */
export async function checkSupabaseTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase.from('secret_envelopes').select('id').limit(1);
    if (!error) return true;
    // If table missing, Postgres returns code 42P01 or message "Could not find the table"
    if (error.message?.includes('Could not find the table') || error.code === '42P01') {
      return false;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Persist an encrypted envelope into Supabase Postgres
 */
export async function persistEnvelopeToSupabase(envelope: EncryptedEnvelope): Promise<boolean> {
  try {
    const { error } = await supabase.from('secret_envelopes').insert([
      {
        id: envelope.id,
        room_id: envelope.roomId,
        sender_id: envelope.senderId,
        sender_name: envelope.senderName,
        type: envelope.type,
        payload: envelope.payload,
        metadata: envelope.metadata,
        reply_to_id: envelope.replyToId,
        timestamp: envelope.timestamp,
      },
    ]);

    if (error) {
      console.warn('Supabase DB persistence warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase DB persistence exception:', err);
    return false;
  }
}

/**
 * Load room encrypted history from Supabase Postgres
 */
export async function fetchEnvelopesFromSupabase(roomId: string): Promise<EncryptedEnvelope[]> {
  try {
    const { data, error } = await supabase
      .from('secret_envelopes')
      .select('*')
      .eq('room_id', roomId)
      .order('timestamp', { ascending: true })
      .limit(100);

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      roomId: row.room_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      type: row.type,
      payload: row.payload,
      metadata: row.metadata,
      replyToId: row.reply_to_id,
      timestamp: Number(row.timestamp),
    }));
  } catch (err) {
    console.warn('Failed to load from Supabase:', err);
    return [];
  }
}

/**
 * Wipe room messages from Supabase Postgres
 */
export async function wipeSupabaseRoom(roomId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('secret_envelopes').delete().eq('room_id', roomId);
    return !error;
  } catch {
    return false;
  }
}

export interface SupabaseRoomSubscription {
  channel: RealtimeChannel;
  broadcastEnvelope: (envelope: EncryptedEnvelope) => Promise<void>;
  broadcastTyping: (userId: string, username: string, isTyping: boolean) => Promise<void>;
  broadcastReaction: (targetMessageId: string, emoji: string, username: string) => Promise<void>;
  broadcastReadReceipt: (messageIds: string[], readByUserId: string) => Promise<void>;
  broadcastWipe: () => Promise<void>;
  leave: () => void;
}

/**
 * Set up real-time broadcast and presence channel for a secret room
 */
export function setupSupabaseRoomChannel(
  roomId: string,
  userId: string,
  username: string,
  handlers: {
    onEnvelope: (envelope: EncryptedEnvelope) => void;
    onTyping: (payload: { userId: string; username: string; isTyping: boolean }) => void;
    onReaction: (payload: { targetMessageId: string; emoji: string; username: string }) => void;
    onReadReceipt: (payload: { messageIds: string[]; readByUserId: string }) => void;
    onWipe: () => void;
    onPresenceChange: (activeParticipants: { userId: string; username: string }[]) => void;
  }
): SupabaseRoomSubscription {
  const channelName = `secret_chat:${roomId}`;
  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { self: false },
      presence: { key: userId },
    },
  });

  // Listen to Broadcast events
  channel
    .on('broadcast', { event: 'envelope' }, (payload) => {
      if (payload.payload) {
        handlers.onEnvelope(payload.payload as EncryptedEnvelope);
      }
    })
    .on('broadcast', { event: 'typing' }, (payload) => {
      if (payload.payload) {
        handlers.onTyping(payload.payload);
      }
    })
    .on('broadcast', { event: 'reaction' }, (payload) => {
      if (payload.payload) {
        handlers.onReaction(payload.payload);
      }
    })
    .on('broadcast', { event: 'read_receipt' }, (payload) => {
      if (payload.payload) {
        handlers.onReadReceipt(payload.payload);
      }
    })
    .on('broadcast', { event: 'wipe' }, () => {
      handlers.onWipe();
    });

  // Listen to Presence events
  channel
    .on('presence', { event: 'sync' }, () => {
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
    })
    .on('presence', { event: 'join' }, () => {
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
    })
    .on('presence', { event: 'leave' }, () => {
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
    });

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
    broadcastEnvelope: async (envelope: EncryptedEnvelope) => {
      await channel.send({
        type: 'broadcast',
        event: 'envelope',
        payload: envelope,
      });
    },
    broadcastTyping: async (uid: string, uname: string, isTyping: boolean) => {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: uid, username: uname, isTyping },
      });
    },
    broadcastReaction: async (targetMessageId: string, emoji: string, uname: string) => {
      await channel.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { targetMessageId, emoji, username: uname },
      });
    },
    broadcastReadReceipt: async (messageIds: string[], readByUserId: string) => {
      await channel.send({
        type: 'broadcast',
        event: 'read_receipt',
        payload: { messageIds, readByUserId },
      });
    },
    broadcastWipe: async () => {
      await channel.send({
        type: 'broadcast',
        event: 'wipe',
        payload: { timestamp: Date.now() },
      });
    },
    leave: () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    },
  };
}
