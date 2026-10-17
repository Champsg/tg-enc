import React, { useState } from 'react';
import { Check, CheckCheck, Reply, Smile, AlertCircle, RotateCcw } from 'lucide-react';
import type { DecryptedMessage } from '../types/chat.ts';

interface MessageItemProps {
  message: DecryptedMessage;
  isMe: boolean;
  peerName: string;
  onReply: (msg: DecryptedMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onRetry: (messageId: string) => void;
}

const COMMON_EMOJIS = ['❤️', '👍', '🔥', '👏', '😂'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isMe,
  peerName,
  onReply,
  onReact,
  onRetry,
}) => {
  const [showReactions, setShowReactions] = useState(false);

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`relative group flex flex-col my-1.5 px-2 ${
        isMe ? 'items-end' : 'items-start'
      }`}
      onMouseLeave={() => setShowReactions(false)}
    >
      {/* Quick actions */}
      <div
        className={`absolute -top-7 ${
          isMe ? 'right-2' : 'left-2'
        } z-20 hidden group-hover:flex items-center gap-1 bg-[#17212b] border border-[#2b394a] rounded-full p-1 shadow-md`}
      >
        <button
          onClick={() => onReply(message)}
          className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-[#202b36] transition-colors"
          title="Reply to message"
          aria-label="Reply to message"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setShowReactions(!showReactions)}
          className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-[#202b36] transition-colors"
          title="React with emoji"
          aria-label="React with emoji"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>
      </div>

      {showReactions && (
        <div
          className={`absolute -top-10 ${
            isMe ? 'right-0' : 'left-0'
          } z-30 flex items-center gap-1 bg-[#17212b] border border-[#2b394a] rounded-full px-2 py-1 shadow-lg`}
        >
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact(message.id, emoji);
                setShowReactions(false);
              }}
              className="text-base hover:scale-125 transition-transform p-1"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div
        className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl shadow-sm text-sm overflow-hidden select-text ${
          isMe
            ? 'bg-[#2b5278] text-[#f5f5f5] rounded-tr-xs'
            : 'bg-[#182533] text-[#f5f5f5] rounded-tl-xs'
        }`}
      >
        {message.replySnippet && (
          <div className="mx-3 mt-2.5 mb-1 p-2 rounded-md bg-black/20 border-l-2 border-[#54a9eb] text-xs">
            <span className="font-semibold text-[#54a9eb] block text-[11px]">
              Replied message
            </span>
            <p className="text-slate-300 truncate text-[11px]">{message.replySnippet}</p>
          </div>
        )}

        {!isMe && (
          <div className="px-3 pt-2 text-[11px] font-semibold text-[#54a9eb]">
            {peerName}
          </div>
        )}

        <div className="px-3.5 py-2 leading-relaxed break-words whitespace-pre-wrap">
          {message.content}
        </div>

        <div className="flex items-center justify-end gap-1 px-3 pb-1.5 pt-0.5 select-none text-[10px] text-slate-300/80">
          <span>{formattedTime}</span>
          {isMe && message.status === 'failed' && (
            <button
              onClick={() => onRetry(message.id)}
              className="flex items-center gap-1 text-rose-300 hover:text-rose-200 transition-colors"
              title="Not saved — tap to retry"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          {isMe && message.status === 'sending' && (
            <span className="w-3 h-3 border border-slate-300/70 border-t-transparent rounded-full animate-spin" />
          )}
          {isMe && (message.status === 'sent' || message.status === 'delivered') && (
            <span title="Sent">
              <Check className="w-3.5 h-3.5 text-slate-400" />
            </span>
          )}
          {isMe && message.status === 'read' && (
            <span title="Read">
              <CheckCheck className="w-3.5 h-3.5 text-[#54a9eb]" />
            </span>
          )}
        </div>
      </div>

      {message.reactions && Object.keys(message.reactions).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 px-1">
          {Object.entries(message.reactions).map(([emoji, users]) => {
            if (!users || users.length === 0) return null;
            return (
              <button
                key={emoji}
                onClick={() => onReact(message.id, emoji)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#17212b] border border-[#2b394a] text-xs hover:border-[#54a9eb] transition-colors"
                title={`Reacted by: ${users.join(', ')}`}
              >
                <span>{emoji}</span>
                <span className="text-[10px] text-slate-300 font-mono">{users.length}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
