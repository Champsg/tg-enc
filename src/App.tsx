import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatArea } from './components/ChatArea.tsx';
import { DeleteChatModal } from './components/DeleteChatModal.tsx';
import { AuthScreen } from './components/AuthScreen.tsx';
import { MessagesSquare } from 'lucide-react';

import {
  setupChatChannel,
  setupInboxChannel,
  persistMessage,
  fetchMessages,
  fetchReactions,
  addReaction,
  removeReaction,
  fetchReadStates,
  markRead,
  deleteConversation,
  upsertConversation,
  touchConversation,
  fetchConversations,
  fetchProfileByUsername,
  fetchProfileById,
  searchProfiles,
  touchLastSeen,
  deleteOwnAccount,
  joinAsUser,
  type ChatSubscription,
} from './lib/supabase.ts';

import {
  loadIdentity,
  saveIdentity,
  clearLocalIdentity,
  loadChats,
  saveChats,
  mergeConversations,
} from './lib/identity.ts';

import {
  buildChatId,
  normalizeUsername,
} from './crypto/crypto.ts';

import { playSentSound, playReceivedSound } from './utils/audio.ts';

import type {
  LocalIdentity,
  ChatSummary,
  DecryptedMessage,
  PeerState,
} from './types/chat.ts';

const PAGE_SIZE = 100;

function resolveReplySnippets(list: DecryptedMessage[]): DecryptedMessage[] {
  const byId = new Map(list.map((m) => [m.id, m]));
  return list.map((m) => {
    if (!m.replyToId || m.replySnippet) return m;
    const parent = byId.get(m.replyToId);
    return parent ? { ...m, replySnippet: parent.content } : m;
  });
}

export default function App() {
  const [identity, setIdentity] = useState<LocalIdentity | null>(() => loadIdentity(null));
  const [chats, setChats] = useState<ChatSummary[]>(() => loadChats());
  const [activeChat, setActiveChat] = useState<ChatSummary | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [peer, setPeer] = useState<PeerState | null>(null);
  const [replyTo, setReplyTo] = useState<DecryptedMessage | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ChatSummary | null>(null);
  const [deletingChat, setDeletingChat] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const identityRef = useRef<LocalIdentity | null>(identity);
  identityRef.current = identity;
  const chatsRef = useRef<ChatSummary[]>(chats);
  chatsRef.current = chats;
  const activeChatRef = useRef<ChatSummary | null>(activeChat);
  activeChatRef.current = activeChat;

  const chatSubRef = useRef<ChatSubscription | null>(null);
  const inboxRef = useRef<ReturnType<typeof setupInboxChannel> | null>(null);

  // ------------------------------------------------------------ persistence

  const persistChats = useCallback((next: ChatSummary[]) => {
    const sorted = [...next].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    setChats(sorted);
    saveChats(sorted);
  }, []);

  const refreshInbox = useCallback(
    async (me: LocalIdentity) => {
      try {
        const rows = await fetchConversations(me.userId);
        const merged = await mergeConversations(me.userId, rows, loadChats(), async (id) => {
          try {
            return await fetchProfileById(id);
          } catch {
            return null;
          }
        });
        persistChats(merged);
      } catch (err) {
        console.warn('Could not refresh the inbox:', err);
      }
    },
    [persistChats]
  );

  // Load inbox + subscribe to real-time events
  useEffect(() => {
    if (!identity) return;
    touchLastSeen(identity.userId);
    refreshInbox(identity);

    inboxRef.current?.unsubscribe();
    inboxRef.current = setupInboxChannel(identity.userId, {
      onConversation: () => {
        if (identityRef.current) refreshInbox(identityRef.current);
      },
      onMessage: (chatId) => {
        if (identityRef.current) refreshInbox(identityRef.current);
        if (activeChatRef.current?.chatId !== chatId) {
          setChats((prev) =>
            prev.map((c) => (c.chatId === chatId ? { ...c, unread: true } : c))
          );
        }
      },
    });

    const interval = setInterval(() => touchLastSeen(identity.userId), 60_000);

    return () => {
      clearInterval(interval);
      inboxRef.current?.unsubscribe();
    };
  }, [identity, refreshInbox]);

  // ------------------------------------------------------------ active chat

  const tearDownChat = useCallback(() => {
    chatSubRef.current?.leave();
    chatSubRef.current = null;
  }, []);

  const openChat = useCallback(
    async (chat: ChatSummary) => {
      const me = identityRef.current;
      if (!me) return;

      tearDownChat();
      setActiveChat(chat);
      setMessages([]);
      setReplyTo(null);
      setIsSidebarOpenMobile(false);

      // Clear unread
      setChats((prev) =>
        prev.map((c) => (c.chatId === chat.chatId ? { ...c, unread: false } : c))
      );

      // Set initial peer state
      setPeer({
        id: chat.peerId,
        name: chat.peerName,
        isTyping: false,
        isOnline: false,
        lastSeen: 0,
      });

      // Load messages
      try {
        const history = await fetchMessages(chat.chatId, { limit: PAGE_SIZE });
        const [reactions, reads] = await Promise.all([
          fetchReactions(chat.chatId).catch(() => []),
          fetchReadStates(chat.chatId).catch((): Record<string, number> => ({})),
        ]);

        const reactionsByMsg = new Map<string, Record<string, string[]>>();
        for (const r of reactions) {
          if (!reactionsByMsg.has(r.messageId)) reactionsByMsg.set(r.messageId, {});
          const map = reactionsByMsg.get(r.messageId)!;
          if (!map[r.emoji]) map[r.emoji] = [];
          map[r.emoji].push(r.username);
        }

        const peerLastRead = reads[chat.peerId] || 0;
        const resolved = history.map((m) => ({
          ...m,
          status:
            m.senderId === me.userId
              ? peerLastRead >= m.timestamp
                ? ('read' as const)
                : ('sent' as const)
              : ('read' as const),
          reactions: reactionsByMsg.get(m.id) || {},
        }));

        setMessages(resolveReplySnippets(resolved));
        setHasMore(history.length >= PAGE_SIZE);

        markRead(chat.chatId, me.userId, Date.now()).catch(() => {});
      } catch (err) {
        console.warn('Could not load chat history:', err);
      }

      // Realtime subscription
      chatSubRef.current = setupChatChannel(chat.chatId, me.userId, me.username, {
        onMessage: (incoming) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return resolveReplySnippets([...prev, incoming]);
          });

          playReceivedSound();
          markRead(chat.chatId, me.userId, Date.now()).catch(() => {});
          chatSubRef.current?.broadcastReadReceipt(me.userId, Date.now()).catch(() => {});

          setChats((prev) =>
            prev.map((c) =>
              c.chatId === chat.chatId
                ? { ...c, lastMessage: incoming.content, updatedAt: incoming.timestamp }
                : c
            )
          );
        },
        onTyping: ({ userId, isTyping }) => {
          if (userId === chat.peerId) {
            setPeer((p) => (p ? { ...p, isTyping } : p));
          }
        },
        onReaction: ({ targetMessageId, emoji, username: u }) => {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== targetMessageId) return m;
              const nextReactions = { ...m.reactions };
              const currentList = nextReactions[emoji] || [];
              if (!currentList.includes(u)) {
                nextReactions[emoji] = [...currentList, u];
              }
              return { ...m, reactions: nextReactions };
            })
          );
        },
        onReadReceipt: ({ readByUserId, at }) => {
          if (readByUserId === chat.peerId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.senderId === me.userId && m.timestamp <= at && m.status !== 'read'
                  ? { ...m, status: 'read' }
                  : m
              )
            );
          }
        },
        onChatDeleted: () => {
          tearDownChat();
          setActiveChat(null);
          setMessages([]);
          setChats((prev) => prev.filter((c) => c.chatId !== chat.chatId));
        },
        onPresenceChange: (activeParticipants) => {
          const isPeerPresent = activeParticipants.some((p) => p.userId === chat.peerId);
          setPeer((p) => (p ? { ...p, isOnline: isPeerPresent } : p));
        },
      });
    },
    [tearDownChat]
  );

  const loadOlderMessages = async () => {
    const chat = activeChatRef.current;
    const me = identityRef.current;
    if (!chat || !me || messages.length === 0 || loadingOlder) return;

    setLoadingOlder(true);
    try {
      const oldest = messages[0].timestamp;
      const older = await fetchMessages(chat.chatId, { before: oldest, limit: PAGE_SIZE });
      const reads: Record<string, number> = await fetchReadStates(chat.chatId).catch(() => ({}));
      const peerLastRead = reads[chat.peerId] || 0;

      const resolved = older.map((m) => ({
        ...m,
        status:
          m.senderId === me.userId
            ? peerLastRead >= m.timestamp
              ? ('read' as const)
              : ('sent' as const)
            : ('read' as const),
        reactions: {},
      }));

      setMessages((prev) => resolveReplySnippets([...resolved, ...prev]));
      setHasMore(older.length >= PAGE_SIZE);
    } catch (err) {
      console.warn('Could not load older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  // ----------------------------------------------------------- send message

  const handleSendMessage = async (text: string, replyToId?: string) => {
    const me = identityRef.current;
    const chat = activeChatRef.current;
    if (!me || !chat || !text.trim()) return;

    const id = 'm_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const now = Date.now();

    const parent = replyToId ? messages.find((m) => m.id === replyToId) : undefined;
    const optimistic: DecryptedMessage = {
      id,
      chatId: chat.chatId,
      senderId: me.userId,
      content: text,
      replyToId,
      replySnippet: parent ? parent.content : undefined,
      timestamp: now,
      status: 'sending',
      reactions: {},
    };

    setMessages((prev) => [...prev, optimistic]);
    playSentSound();

    try {
      await persistMessage({
        id,
        chatId: chat.chatId,
        senderId: me.userId,
        content: text,
        replyToId,
        timestamp: now,
      });

      await chatSubRef.current?.broadcastMessage({
        ...optimistic,
        status: 'sent',
      });

      await touchConversation(chat.chatId, now);

      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'sent' } : m))
      );

      setChats((prev) => {
        const next = prev.map((c) =>
          c.chatId === chat.chatId ? { ...c, lastMessage: text, updatedAt: now } : c
        );
        return [...next].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'failed' } : m))
      );
    }
  };

  const handleRetryMessage = async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    const me = identityRef.current;
    const chat = activeChatRef.current;
    if (!msg || !me || !chat) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, status: 'sending' } : m))
    );

    try {
      await persistMessage({
        id: msg.id,
        chatId: chat.chatId,
        senderId: me.userId,
        content: msg.content,
        replyToId: msg.replyToId,
        timestamp: msg.timestamp,
      });

      await chatSubRef.current?.broadcastMessage({ ...msg, status: 'sent' });
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: 'sent' } : m))
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: 'failed' } : m))
      );
    }
  };

  const handleTyping = (isTyping: boolean) => {
    const me = identityRef.current;
    if (!me) return;
    chatSubRef.current?.broadcastTyping(me.userId, me.username, isTyping).catch(() => {});
  };

  const handleReact = async (messageId: string, emoji: string) => {
    const me = identityRef.current;
    const chat = activeChatRef.current;
    if (!me || !chat) return;

    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    const list = msg.reactions[emoji] || [];
    const alreadyReacted = list.includes(me.username);

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const next = { ...m.reactions };
        if (alreadyReacted) {
          next[emoji] = (next[emoji] || []).filter((u) => u !== me.username);
          if (next[emoji].length === 0) delete next[emoji];
        } else {
          next[emoji] = [...(next[emoji] || []), me.username];
        }
        return { ...m, reactions: next };
      })
    );

    try {
      if (alreadyReacted) {
        await removeReaction(messageId, me.userId, emoji);
      } else {
        await addReaction(messageId, chat.chatId, me.userId, me.username, emoji);
        await chatSubRef.current?.broadcastReaction({
          targetMessageId: messageId,
          emoji,
          username: me.username,
        });
      }
    } catch (err) {
      console.warn('Could not save reaction:', err);
    }
  };

  // ----------------------------------------------------------- start chat

  const handleStartChat = async (targetHandleOrQuery: string): Promise<string | null> => {
    const me = identityRef.current;
    if (!me) return 'Please enter a username first.';

    const clean = normalizeUsername(targetHandleOrQuery);
    if (clean === me.username.toLowerCase()) {
      return "You can't start a chat with yourself.";
    }

    let profile = await fetchProfileByUsername(clean);
    if (!profile) {
      const results = await searchProfiles(targetHandleOrQuery, me.userId);
      if (results.length > 0) profile = results[0];
    }

    if (!profile) {
      // Create a placeholder profile so users can message someone who hasn't opened the app yet
      profile = {
        userId: `u_${clean}`,
        username: clean,
        displayName: clean,
      };
    }

    const chatId = buildChatId(me.userId, profile.userId);
    const now = Date.now();

    await upsertConversation({
      chatId,
      userA: me.userId,
      userB: profile.userId,
      updatedAt: now,
    });

    const newChat: ChatSummary = {
      chatId,
      peerId: profile.userId,
      peerUsername: profile.username,
      peerName: profile.displayName,
      updatedAt: now,
      lastMessage: undefined,
      unread: false,
    };

    setChats((prev) => {
      const filtered = prev.filter((c) => c.chatId !== chatId);
      return [newChat, ...filtered];
    });

    openChat(newChat);
    return null;
  };

  // ---------------------------------------------------------- delete chat

  const handleDeleteChatConfirm = async () => {
    if (!deleteTarget) return;
    setDeletingChat(true);
    try {
      await deleteConversation(deleteTarget.chatId);
      await chatSubRef.current?.broadcastChatDeleted();

      if (activeChat?.chatId === deleteTarget.chatId) {
        tearDownChat();
        setActiveChat(null);
        setMessages([]);
      }

      persistChats(chats.filter((c) => c.chatId !== deleteTarget.chatId));
      setDeleteTarget(null);
    } finally {
      setDeletingChat(false);
    }
  };

  // ------------------------------------------------------------- auth

  const handleJoin = async (username: string, displayName: string): Promise<string | null> => {
    const res = await joinAsUser(username, displayName);
    if (res.error) return res.error;
    if (res.user) {
      setIdentity(res.user);
      saveIdentity(res.user);
    }
    return null;
  };

  const handleSignOut = async () => {
    tearDownChat();
    clearLocalIdentity();
    setIdentity(null);
    setActiveChat(null);
    setMessages([]);
    setChats([]);
  };

  const handleDeleteAccount = async () => {
    const me = identityRef.current;
    if (!me) return;
    await deleteOwnAccount(me.userId);
    handleSignOut();
  };

  // -------------------------------------------------------------- render

  if (!identity) {
    return <AuthScreen onJoin={handleJoin} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#0e1621] text-slate-100 overflow-hidden font-sans">
      <Header
        identity={identity}
        activeChat={activeChat}
        peer={peer}
        onDeleteChat={() => activeChat && setDeleteTarget(activeChat)}
        onSignOut={handleSignOut}
        onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          identity={identity}
          chats={chats}
          activeChatId={activeChat?.chatId || null}
          onOpenChat={openChat}
          onStartChat={handleStartChat}
          onDeleteChat={(chat) => setDeleteTarget(chat)}
          onSignOut={handleSignOut}
          onDeleteAccount={handleDeleteAccount}
          isOpen={isSidebarOpenMobile}
          onCloseMobile={() => setIsSidebarOpenMobile(false)}
        />

        {activeChat ? (
          <ChatArea
            myUserId={identity.userId}
            peerName={activeChat.peerName || `@${activeChat.peerUsername}`}
            peer={peer}
            messages={messages}
            hasMore={hasMore}
            loadingOlder={loadingOlder}
            onLoadOlder={loadOlderMessages}
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            onReact={handleReact}
            onRetry={handleRetryMessage}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
          />
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-slate-500 text-sm bg-[#0e1621] select-none p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#17212b] border border-[#242f3d] flex items-center justify-center mb-4 text-[#54a9eb]">
              <MessagesSquare className="w-8 h-8" />
            </div>
            <p className="font-semibold text-white mb-1">Select a chat to start messaging</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Search a friend by @username from the left sidebar to start chatting.
            </p>
          </div>
        )}
      </div>

      <DeleteChatModal
        isOpen={Boolean(deleteTarget)}
        peerName={deleteTarget?.peerName || deleteTarget?.peerUsername || 'Friend'}
        busy={deletingChat}
        onConfirm={handleDeleteChatConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
