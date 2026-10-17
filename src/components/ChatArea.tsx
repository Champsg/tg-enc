import React, { useRef, useEffect } from 'react';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { MessageItem } from './MessageItem.tsx';
import { MessageInput } from './MessageInput.tsx';
import type { DecryptedMessage, PeerState } from '../types/chat.ts';

interface ChatAreaProps {
  myUserId: string;
  peerName: string;
  peer: PeerState | null;
  messages: DecryptedMessage[];
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onSendMessage: (text: string, replyToId?: string) => void;
  onTyping: (isTyping: boolean) => void;
  onReact: (messageId: string, emoji: string) => void;
  onRetry: (messageId: string) => void;
  replyTo: DecryptedMessage | null;
  setReplyTo: (msg: DecryptedMessage | null) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  myUserId,
  peerName,
  peer,
  messages,
  hasMore,
  loadingOlder,
  onLoadOlder,
  onSendMessage,
  onTyping,
  onReact,
  onRetry,
  replyTo,
  setReplyTo,
}) => {
  const scrollBottomRef = useRef<HTMLDivElement | null>(null);
  const prevCountRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e1621] relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)`,
          backgroundSize: '100px 100px',
        }}
      />

      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 z-10 flex flex-col justify-start">
        {messages.length === 0 ? (
          <div className="my-auto max-w-md mx-auto bg-[#17212b]/95 border border-[#242f3d] rounded-2xl p-6 text-center shadow-xl">
            <div className="w-14 h-14 rounded-full bg-[#2481cc]/20 border border-[#2481cc]/40 flex items-center justify-center mx-auto mb-4 text-[#54a9eb]">
              <MessageCircle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Start a conversation with {peerName}
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Say hello! Messages are delivered instantly in real time and saved to your chat history.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#202b36] border border-[#2b394a] text-xs text-[#54a9eb]">
              <Send className="w-3.5 h-3.5" />
              <span>Type your message below</span>
            </div>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center mb-3">
                <button
                  onClick={onLoadOlder}
                  disabled={loadingOlder}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#17212b] border border-[#242f3d] text-[11px] text-slate-300 hover:text-white hover:bg-[#202b36] transition-colors"
                >
                  {loadingOlder && <Loader2 className="w-3 h-3 animate-spin" />}
                  {loadingOlder ? 'Loading…' : 'Load older messages'}
                </button>
              </div>
            )}

            <div className="flex justify-center my-3 select-none">
              <span className="text-[11px] font-medium text-slate-300 bg-[#17212b]/80 px-3 py-1 rounded-full border border-[#242f3d]">
                {new Date(messages[0].timestamp).toLocaleDateString([], {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>

            {messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                isMe={msg.senderId === myUserId}
                peerName={peerName}
                onReply={(m) => setReplyTo(m)}
                onReact={onReact}
                onRetry={onRetry}
              />
            ))}
          </>
        )}

        {peer?.isTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-400 px-4 py-2 mt-1 select-none">
            <span className="font-medium text-[#54a9eb]">{peer.name}</span>
            <span>is typing</span>
            <div className="flex items-center gap-1 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#54a9eb] animate-bounce" />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#54a9eb] animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#54a9eb] animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        )}

        <div ref={scrollBottomRef} />
      </div>

      <div className="z-20">
        <MessageInput
          onSendMessage={onSendMessage}
          onTyping={onTyping}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  );
};
