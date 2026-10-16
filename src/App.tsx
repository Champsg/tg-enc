/**
 * tg-enc
 * 1-on-1 End-to-End Encrypted Cloud Messenger
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatArea } from './components/ChatArea.tsx';
import { SafetyNumberModal } from './components/SafetyNumberModal.tsx';
import { QRModal } from './components/QRModal.tsx';
import { ScreenShield } from './components/ScreenShield.tsx';
import { PanicWipeModal } from './components/PanicWipeModal.tsx';
import { MediaLightbox } from './components/MediaLightbox.tsx';
import { JoinCreateModal } from './components/JoinCreateModal.tsx';
import { SupabaseModal } from './components/SupabaseModal.tsx';

import {
  setupSupabaseRoomChannel,
  persistEnvelopeToSupabase,
  fetchEnvelopesFromSupabase,
  wipeSupabaseRoom,
  type SupabaseRoomSubscription,
} from './lib/supabase.ts';

import {
  deriveRoomKey,
  encryptText,
  decryptText,
  encryptBinary,
  decryptBinary,
  generateSafetyNumber,
  base64ToUint8Array,
  uint8ArrayToBase64,
} from './crypto/crypto.ts';

import {
  playSentSound,
  playReceivedSound,
  playWipeSound,
} from './utils/audio.ts';

import type {
  UserSession,
  PeerState,
  DecryptedMessage,
  EncryptedEnvelope,
} from './types/chat.ts';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [peer, setPeer] = useState<PeerState | null>(null);
  const [replyTo, setReplyTo] = useState<DecryptedMessage | null>(null);

  // Modals & Privacy Controls
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isPanicModalOpen, setIsPanicModalOpen] = useState(false);
  const [activeLightbox, setActiveLightbox] = useState<{ url: string; name?: string } | null>(null);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const supabaseSubRef = useRef<SupabaseRoomSubscription | null>(null);
  const cryptoKeyRef = useRef<CryptoKey | null>(null);
  cryptoKeyRef.current = cryptoKey;

  // Track created object URLs so we can cleanly revoke on unmount or wipe
  const createdObjectUrlsRef = useRef<string[]>([]);

  const registerBlobUrl = (url: string) => {
    createdObjectUrlsRef.current.push(url);
    return url;
  };

  const cleanupObjectUrls = () => {
    createdObjectUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });
    createdObjectUrlsRef.current = [];
  };

  // Helper to decrypt an envelope into a DecryptedMessage
  const decryptEnvelope = useCallback(
    async (envelope: EncryptedEnvelope, key: CryptoKey): Promise<DecryptedMessage | null> => {
      try {
        if (!envelope.payload) return null;

        if (envelope.type === 'text') {
          const plainText = await decryptText(
            envelope.payload.ciphertext,
            envelope.payload.iv,
            key
          );
          return {
            id: envelope.id,
            roomId: envelope.roomId,
            senderId: envelope.senderId,
            senderName: envelope.senderName,
            type: 'text',
            content: plainText,
            replyToId: envelope.replyToId,
            timestamp: envelope.timestamp,
            status: 'read',
            reactions: {},
          };
        }

        if (envelope.type === 'file' || envelope.type === 'audio') {
          const decryptedBytes = await decryptBinary(
            envelope.payload.ciphertext,
            envelope.payload.iv,
            key
          );
          const mimeType = envelope.metadata?.mimeType || 'application/octet-stream';
          const blob = new Blob([decryptedBytes as unknown as BlobPart], { type: mimeType });
          const blobUrl = registerBlobUrl(URL.createObjectURL(blob));

          let previewContent = '';
          if (mimeType.startsWith('image/')) {
            previewContent = `data:${mimeType};base64,${uint8ArrayToBase64(decryptedBytes)}`;
          }

          return {
            id: envelope.id,
            roomId: envelope.roomId,
            senderId: envelope.senderId,
            senderName: envelope.senderName,
            type: envelope.type,
            content: previewContent,
            fileBlobUrl: blobUrl,
            fileMetadata: envelope.metadata,
            replyToId: envelope.replyToId,
            timestamp: envelope.timestamp,
            status: 'read',
            reactions: {},
          };
        }

        return null;
      } catch (err) {
        console.error('Failed to decrypt envelope:', err);
        return null;
      }
    },
    []
  );

  // Initialize room session and derive key
  const handleJoinOrCreate = async (params: {
    username: string;
    roomId: string;
    roomPasskey: string;
    isHost: boolean;
  }) => {
    try {
      const derivedKey = await deriveRoomKey(params.roomPasskey, params.roomId);
      const safetyNumber = await generateSafetyNumber(derivedKey);

      // Stable user ID
      let userId = sessionStorage.getItem('telegram_secret_user_id');
      if (!userId) {
        userId = `user-${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('telegram_secret_user_id', userId);
      }

      const newSession: UserSession = {
        userId,
        username: params.username,
        roomId: params.roomId,
        roomPasskey: params.roomPasskey,
        safetyNumber,
        isHost: params.isHost,
      };

      setCryptoKey(derivedKey);
      setSession(newSession);

      // Connect WebSocket & Supabase Cloud
      connectWebSocket(newSession, derivedKey);
      connectSupabase(newSession, derivedKey);
    } catch (err) {
      console.error('Failed to initialize secret room:', err);
      alert('Failed to derive encryption keys. Please try again.');
    }
  };

  // Connect Supabase Realtime Channel and load history
  const connectSupabase = (sess: UserSession, key: CryptoKey) => {
    if (supabaseSubRef.current) {
      supabaseSubRef.current.leave();
    }

    // Load existing history from Supabase Postgres if table exists
    fetchEnvelopesFromSupabase(sess.roomId).then(async (envelopes) => {
      if (envelopes.length > 0) {
        const decryptedList: DecryptedMessage[] = [];
        for (const env of envelopes) {
          const dec = await decryptEnvelope(env, key);
          if (dec) decryptedList.push(dec);
        }
        if (decryptedList.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newOnes = decryptedList.filter((m) => !existingIds.has(m.id));
            return [...prev, ...newOnes];
          });
        }
      }
    });

    const sub = setupSupabaseRoomChannel(sess.roomId, sess.userId, sess.username, {
      onEnvelope: async (env) => {
        const dec = await decryptEnvelope(env, key);
        if (dec) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === dec.id)) return prev;
            return [...prev, dec];
          });
          if (dec.senderId !== sess.userId) {
            playReceivedSound();
            sub.broadcastReadReceipt([dec.id], sess.userId);
          }
        }
      },
      onTyping: (payload) => {
        if (payload.userId !== sess.userId) {
          setPeer((prev) => ({
            id: payload.userId,
            name: payload.username || 'Friend',
            isTyping: !!payload.isTyping,
            isOnline: true,
            lastSeen: Date.now(),
          }));
        }
      },
      onReaction: (payload) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== payload.targetMessageId) return m;
            const newReactions = { ...m.reactions };
            const list = newReactions[payload.emoji] || [];
            if (list.includes(payload.username)) {
              newReactions[payload.emoji] = list.filter((u) => u !== payload.username);
            } else {
              newReactions[payload.emoji] = [...list, payload.username];
            }
            return { ...m, reactions: newReactions };
          })
        );
      },
      onReadReceipt: (payload) => {
        setMessages((prev) =>
          prev.map((m) =>
            payload.messageIds.includes(m.id) ? { ...m, status: 'read' } : m
          )
        );
      },
      onWipe: () => {
        playWipeSound();
        cleanupObjectUrls();
        setMessages([]);
        alert('Notice: The secret chat room was wiped.');
      },
      onPresenceChange: (activeParticipants) => {
        const others = activeParticipants.filter((p) => p.userId !== sess.userId);
        if (others.length > 0) {
          setPeer({
            id: others[0].userId,
            name: others[0].username,
            isTyping: false,
            isOnline: true,
            lastSeen: Date.now(),
          });
        }
      },
    });

    supabaseSubRef.current = sub;
  };

  // Connect WebSocket to cloud relay
  const connectWebSocket = (sess: UserSession, key: CryptoKey) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      // Send join event
      socket.send(
        JSON.stringify({
          type: 'join',
          roomId: sess.roomId,
          userId: sess.userId,
          username: sess.username,
        })
      );
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'history': {
            if (Array.isArray(data.messages) && key) {
              const decryptedList: DecryptedMessage[] = [];
              for (const env of data.messages) {
                const dec = await decryptEnvelope(env, key);
                if (dec) decryptedList.push(dec);
              }
              setMessages(decryptedList);
            }
            break;
          }

          case 'envelope': {
            const env = data.envelope as EncryptedEnvelope;
            if (env && key) {
              const dec = await decryptEnvelope(env, key);
              if (dec) {
                setMessages((prev) => {
                  // Guard against duplicates (idempotency)
                  if (prev.some((m) => m.id === dec.id)) return prev;
                  return [...prev, dec];
                });

                if (dec.senderId !== sess.userId) {
                  playReceivedSound();
                  // Send read receipt
                  if (socket.readyState === WebSocket.OPEN) {
                    socket.send(
                      JSON.stringify({
                        type: 'read_receipt',
                        messageIds: [dec.id],
                      })
                    );
                  }
                }
              }
            }
            break;
          }

          case 'ack': {
            // Confirm delivery of sent message
            setMessages((prev) =>
              prev.map((m) =>
                m.id === data.id ? { ...m, status: 'delivered' } : m
              )
            );
            break;
          }

          case 'read_receipt': {
            if (Array.isArray(data.messageIds)) {
              setMessages((prev) =>
                prev.map((m) =>
                  data.messageIds.includes(m.id) ? { ...m, status: 'read' } : m
                )
              );
            }
            break;
          }

          case 'typing': {
            if (data.userId !== sess.userId) {
              setPeer((prev) => ({
                id: data.userId,
                name: data.username || 'Friend',
                isTyping: !!data.isTyping,
                isOnline: true,
                lastSeen: Date.now(),
              }));
            }
            break;
          }

          case 'presence': {
            const others = (data.participants || []).filter(
              (p: { userId: string }) => p.userId !== sess.userId
            );
            if (others.length > 0) {
              setPeer({
                id: others[0].userId,
                name: others[0].username,
                isTyping: false,
                isOnline: true,
                lastSeen: Date.now(),
              });
            } else {
              setPeer((prev) => (prev ? { ...prev, isOnline: false } : null));
            }
            break;
          }

          case 'reaction': {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== data.targetMessageId) return m;
                const newReactions = { ...m.reactions };
                const list = newReactions[data.emoji] || [];
                if (list.includes(data.username)) {
                  newReactions[data.emoji] = list.filter((u) => u !== data.username);
                } else {
                  newReactions[data.emoji] = [...list, data.username];
                }
                return { ...m, reactions: newReactions };
              })
            );
            break;
          }

          case 'wiped': {
            // Room was wiped
            playWipeSound();
            cleanupObjectUrls();
            setMessages([]);
            alert('Notice: The secret chat room was wiped.');
            break;
          }
        }
      } catch (err) {
        console.error('Error handling incoming WebSocket message:', err);
      }
    };

    socket.onclose = () => {
      // Reconnection logic if session is still active
      setTimeout(() => {
        if (wsRef.current === socket && session && cryptoKey) {
          connectWebSocket(session, cryptoKey);
        }
      }, 2500);
    };
  };

  // Send Text Message
  const handleSendMessage = async (text: string, replyToId?: string) => {
    if (!session || !cryptoKey || !wsRef.current) return;

    try {
      const { ciphertext, iv } = await encryptText(text, cryptoKey);
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const envelope: EncryptedEnvelope = {
        id: messageId,
        roomId: session.roomId,
        senderId: session.userId,
        senderName: session.username,
        type: 'text',
        payload: { ciphertext, iv },
        replyToId,
        timestamp: Date.now(),
      };

      // Optimistic local update
      const localMsg: DecryptedMessage = {
        id: messageId,
        roomId: session.roomId,
        senderId: session.userId,
        senderName: session.username,
        type: 'text',
        content: text,
        replyToId,
        replySnippet: replyTo?.content || replyTo?.fileMetadata?.fileName,
        timestamp: envelope.timestamp,
        status: 'sent',
        reactions: {},
      };

      setMessages((prev) => [...prev, localMsg]);
      playSentSound();

      // Relay through cloud WebSocket
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'envelope', envelope }));
      }

      // Relay through Supabase Realtime Channel & persist encrypted envelope
      supabaseSubRef.current?.broadcastEnvelope(envelope);
      persistEnvelopeToSupabase(envelope);
    } catch (err) {
      console.error('Failed to encrypt and send message:', err);
    }
  };

  // Send Encrypted File / Photo
  const handleSendFile = async (file: File, replyToId?: string) => {
    if (!session || !cryptoKey || !wsRef.current) return;

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const { ciphertext, iv } = await encryptBinary(bytes, cryptoKey);
      const messageId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const envelope: EncryptedEnvelope = {
        id: messageId,
        roomId: session.roomId,
        senderId: session.userId,
        senderName: session.username,
        type: 'file',
        payload: { ciphertext, iv },
        metadata: {
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
        },
        replyToId,
        timestamp: Date.now(),
      };

      // Optimistic preview
      const isImg = file.type.startsWith('image/');
      let previewContent = '';
      if (isImg) {
        previewContent = `data:${file.type};base64,${uint8ArrayToBase64(bytes)}`;
      }

      const blob = new Blob([bytes as unknown as BlobPart], { type: file.type });
      const blobUrl = registerBlobUrl(URL.createObjectURL(blob));

      const localMsg: DecryptedMessage = {
        id: messageId,
        roomId: session.roomId,
        senderId: session.userId,
        senderName: session.username,
        type: 'file',
        content: previewContent,
        fileBlobUrl: blobUrl,
        fileMetadata: envelope.metadata,
        replyToId,
        replySnippet: replyTo?.content || replyTo?.fileMetadata?.fileName,
        timestamp: envelope.timestamp,
        status: 'sent',
        reactions: {},
      };

      setMessages((prev) => [...prev, localMsg]);
      playSentSound();

      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'envelope', envelope }));
      }

      // Broadcast and persist to Supabase
      supabaseSubRef.current?.broadcastEnvelope(envelope);
      persistEnvelopeToSupabase(envelope);
    } catch (err) {
      console.error('Failed to encrypt and send file:', err);
      alert('Failed to encrypt file. Check file size and format.');
    }
  };

  // Send Encrypted Voice Note
  const handleSendVoiceNote = async (audioBlob: Blob, duration: number, replyToId?: string) => {
    if (!session || !cryptoKey || !wsRef.current) return;

    try {
      const buffer = await audioBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const { ciphertext, iv } = await encryptBinary(bytes, cryptoKey);
      const messageId = `audio-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const envelope: EncryptedEnvelope = {
        id: messageId,
        roomId: session.roomId,
        senderId: session.userId,
        senderName: session.username,
        type: 'audio',
        payload: { ciphertext, iv },
        metadata: {
          fileName: 'Voice Message.webm',
          mimeType: audioBlob.type || 'audio/webm',
          fileSize: audioBlob.size,
          duration,
        },
        replyToId,
        timestamp: Date.now(),
      };

      const blobUrl = registerBlobUrl(URL.createObjectURL(audioBlob));

      const localMsg: DecryptedMessage = {
        id: messageId,
        roomId: session.roomId,
        senderId: session.userId,
        senderName: session.username,
        type: 'audio',
        content: '',
        fileBlobUrl: blobUrl,
        fileMetadata: envelope.metadata,
        replyToId,
        replySnippet: replyTo?.content || replyTo?.fileMetadata?.fileName,
        timestamp: envelope.timestamp,
        status: 'sent',
        reactions: {},
      };

      setMessages((prev) => [...prev, localMsg]);
      playSentSound();

      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'envelope', envelope }));
      }

      // Broadcast and persist voice note to Supabase
      supabaseSubRef.current?.broadcastEnvelope(envelope);
      persistEnvelopeToSupabase(envelope);
    } catch (err) {
      console.error('Failed to encrypt voice message:', err);
    }
  };

  // Send Typing Indicator
  const handleTyping = (isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', isTyping }));
    }
    if (session) {
      supabaseSubRef.current?.broadcastTyping(session.userId, session.username, isTyping);
    }
  };

  // Send Reaction
  const handleReact = (messageId: string, emoji: string) => {
    if (!session || !wsRef.current) return;

    // Optimistic local update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const newReactions = { ...m.reactions };
        const list = newReactions[emoji] || [];
        if (list.includes(session.username)) {
          newReactions[emoji] = list.filter((u) => u !== session.username);
        } else {
          newReactions[emoji] = [...list, session.username];
        }
        return { ...m, reactions: newReactions };
      })
    );

    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'reaction',
          targetMessageId: messageId,
          emoji,
        })
      );
    }

    supabaseSubRef.current?.broadcastReaction(messageId, emoji, session.username);
  };

  // Perform Panic Wipe
  const handleConfirmPanicWipe = async () => {
    setIsPanicModalOpen(false);
    playWipeSound();

    if (session) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'wipe' }));
      }
      // Also trigger server-side REST wipe
      fetch(`/api/room/${encodeURIComponent(session.roomId)}/wipe`, {
        method: 'POST',
      }).catch(() => {});

      // Wipe Supabase room and broadcast
      supabaseSubRef.current?.broadcastWipe();
      wipeSupabaseRoom(session.roomId);
    }

    if (supabaseSubRef.current) {
      supabaseSubRef.current.leave();
      supabaseSubRef.current = null;
    }

    cleanupObjectUrls();
    setMessages([]);
    setSession(null);
    setCryptoKey(null);
    setPeer(null);
    setReplyTo(null);

    // Clear hash
    window.history.replaceState(null, '', window.location.pathname);
  };

  const handleLeaveRoom = () => {
    if (confirm('Leave this secret chat room?')) {
      if (wsRef.current) wsRef.current.close();
      if (supabaseSubRef.current) {
        supabaseSubRef.current.leave();
        supabaseSubRef.current = null;
      }
      cleanupObjectUrls();
      setMessages([]);
      setSession(null);
      setCryptoKey(null);
      setPeer(null);
      setReplyTo(null);
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // If no active session, render the Join / Create Room Modal
  if (!session) {
    return <JoinCreateModal onJoinOrCreate={handleJoinOrCreate} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0e1621] text-white overflow-hidden select-none font-sans">
      {/* Top Bar Header */}
      <Header
        session={session}
        peer={peer}
        onOpenSafetyModal={() => setIsSafetyModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onTriggerShield={() => setIsShieldActive(true)}
        onTriggerPanicWipe={() => setIsPanicModalOpen(true)}
        onToggleSidebar={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
        isSidebarOpen={isSidebarOpenMobile}
      />

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          session={session}
          peer={peer}
          messages={messages}
          onOpenSafetyModal={() => setIsSafetyModalOpen(true)}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          onOpenQRModal={() => setIsQRModalOpen(true)}
          onLeaveRoom={handleLeaveRoom}
          onSelectMedia={(m) => {
            if (m.fileMetadata?.mimeType?.startsWith('image/') && m.content) {
              setActiveLightbox({ url: m.content, name: m.fileMetadata.fileName });
            }
          }}
          isOpen={isSidebarOpenMobile}
          onCloseMobile={() => setIsSidebarOpenMobile(false)}
        />

        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <ChatArea
            session={session}
            peer={peer}
            messages={messages}
            onSendMessage={handleSendMessage}
            onSendFile={handleSendFile}
            onSendVoiceNote={handleSendVoiceNote}
            onTyping={handleTyping}
            onReact={handleReact}
            onImageClick={(url, name) => setActiveLightbox({ url, name })}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
          />
        </main>
      </div>

      {/* Modals & Overlays */}
      <SafetyNumberModal
        safetyNumber={session.safetyNumber}
        friendName={peer?.name || 'Friend'}
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
      />

      <QRModal
        roomId={session.roomId}
        roomPasskey={session.roomPasskey}
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
      />

      <ScreenShield
        isActive={isShieldActive}
        onUnlock={() => setIsShieldActive(false)}
      />

      <PanicWipeModal
        isOpen={isPanicModalOpen}
        onConfirm={handleConfirmPanicWipe}
        onCancel={() => setIsPanicModalOpen(false)}
      />

      <MediaLightbox
        imageUrl={activeLightbox?.url || null}
        fileName={activeLightbox?.name}
        onClose={() => setActiveLightbox(null)}
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
}
