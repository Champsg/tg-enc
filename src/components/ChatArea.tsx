import React, { useRef, useEffect } from 'react';
import { ShieldCheck, Lock, Copy, Check } from 'lucide-react';
import { MessageItem } from './MessageItem.tsx';
import { MessageInput } from './MessageInput.tsx';
import type { DecryptedMessage, PeerState, UserSession } from '../types/chat.ts';

interface ChatAreaProps {
  session: UserSession;
  peer: PeerState | null;
  messages: DecryptedMessage[];
  onSendMessage: (text: string, replyToId?: string) => void;
  onSendFile: (file: File, replyToId?: string) => void;
  onSendVoiceNote: (audioBlob: Blob, duration: number, replyToId?: string) => void;
  onTyping: (isTyping: boolean) => void;
  onReact: (messageId: string, emoji: string) => void;
  onImageClick: (imgUrl: string, name?: string) => void;
  replyTo: DecryptedMessage | null;
  setReplyTo: (msg: DecryptedMessage | null) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  session,
  peer,
  messages,
  onSendMessage,
  onSendFile,
  onSendVoiceNote,
  onTyping,
  onReact,
  onImageClick,
  replyTo,
  setReplyTo,
}) => {
  const scrollBottomRef = useRef<HTMLDivElement | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Auto-scroll on new message
  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleCopyInvite = () => {
    const inviteLink = `${window.location.origin}/#room=${encodeURIComponent(session.roomId)}&key=${encodeURIComponent(session.roomPasskey)}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e1621] relative overflow-hidden">
      {/* Telegram Subtle Chat Wallpaper Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)`,
          backgroundSize: '100px 100px',
        }}
      />

      {/* Message Scroll Container */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 z-10 flex flex-col justify-start">
        {messages.length === 0 ? (
          // Telegram Secret Chat Empty Welcome Card
          <div className="my-auto max-w-md mx-auto bg-[#17212b]/95 border border-[#242f3d] rounded-2xl p-6 text-center shadow-xl backdrop-blur-xs">
            <div className="w-14 h-14 rounded-full bg-[#2481cc]/20 border border-[#2481cc]/40 flex items-center justify-center mx-auto mb-4 text-[#54a9eb]">
              <Lock className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              End-to-End Encrypted Secret Chat
            </h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Messages and files in this room are encrypted on your device. Only you and your friend hold the keys.
            </p>

            <div className="bg-[#202b36] rounded-xl p-3 mb-5 text-left space-y-2 text-xs text-slate-300 border border-[#2b394a]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>256-bit AES-GCM cryptographic encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero server logs or plaintext stored in cloud</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Encrypted photos, documents & voice messages</span>
              </div>
            </div>

            <button
              onClick={handleCopyInvite}
              className="w-full py-2.5 px-4 rounded-xl bg-[#2481cc] hover:bg-[#2072b5] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? 'Invite Link Copied to Clipboard!' : 'Copy Secret Invite Link for Friend'}
            </button>
          </div>
        ) : (
          <>
            {/* Date separator */}
            <div className="flex justify-center my-3 select-none">
              <span className="text-[11px] font-medium text-slate-300 bg-[#17212b]/80 px-3 py-1 rounded-full border border-[#242f3d]">
                Secret Session Active
              </span>
            </div>

            {/* Message Items */}
            {messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                isMe={msg.senderId === session.userId}
                onReply={(m) => setReplyTo(m)}
                onReact={onReact}
                onImageClick={onImageClick}
              />
            ))}
          </>
        )}

        {/* Friend Typing Indicator */}
        {peer?.isTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-400 px-4 py-2 mt-1 animate-in fade-in select-none">
            <span className="font-medium text-[#54a9eb]">{peer.name}</span>
            <span>is typing</span>
            <div className="flex items-center gap-1 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#54a9eb] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#54a9eb] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#54a9eb] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={scrollBottomRef} />
      </div>

      {/* Bottom Message Input */}
      <div className="z-20">
        <MessageInput
          onSendMessage={onSendMessage}
          onSendFile={onSendFile}
          onSendVoiceNote={onSendVoiceNote}
          onTyping={onTyping}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  );
};
