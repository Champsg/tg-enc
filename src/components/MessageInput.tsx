import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, X } from 'lucide-react';
import type { DecryptedMessage } from '../types/chat.ts';

interface MessageInputProps {
  onSendMessage: (text: string, replyToId?: string) => void;
  onTyping: (isTyping: boolean) => void;
  replyTo: DecryptedMessage | null;
  onCancelReply: () => void;
  disabled?: boolean;
}

const EMOJI_LIST = [
  '😀', '😂', '🔥', '❤️', '👍', '🙏', '👏', '🎉',
  '😎', '🤫', '🔒', '🔑', '👀', '🚀', '✨', '⚡',
  '☕', '🍕', '🍻', '💯', '🤔', '🙌', '💪', '🤝',
];

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  replyTo,
  onCancelReply,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollH, 120)}px`;
    }
  }, [text]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    onTyping(true);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => onTyping(false), 1800);
  };

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSendMessage(text.trim(), replyTo?.id);
    setText('');
    onTyping(false);
    if (replyTo) onCancelReply();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="bg-[#17212b] border-t border-[#242f3d] p-3 relative select-none">
      {replyTo && (
        <div className="flex items-center justify-between bg-[#202b36] border-l-3 border-[#2481cc] px-3 py-1.5 rounded-r-lg mb-2 text-xs">
          <div className="min-w-0 pr-2">
            <span className="font-semibold text-[#54a9eb] block text-[11px]">
              Replying to {replyTo.senderId === 'me' ? 'yourself' : 'message'}
            </span>
            <p className="text-slate-300 truncate text-[11px]">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="text-slate-400 hover:text-white p-1 transition-colors"
            title="Cancel reply"
            aria-label="Cancel reply"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 z-30 bg-[#17212b] border border-[#2b394a] rounded-xl p-2 shadow-2xl grid grid-cols-8 gap-1.5 w-72">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addEmoji(emoji)}
              className="text-xl p-1 hover:bg-[#202b36] rounded-md transition-transform hover:scale-115"
              aria-label={`Insert ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 max-w-5xl mx-auto">
        <div className="flex-1 flex items-end bg-[#202b36] rounded-2xl border border-[#2b394a] focus-within:border-[#2481cc] transition-colors px-3 py-1.5">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a message…"
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 resize-none outline-hidden max-h-32 py-1 leading-relaxed"
          />
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors ml-1 shrink-0"
            title="Emoji"
            aria-label="Choose emoji"
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="w-10 h-10 rounded-full bg-[#2481cc] hover:bg-[#2072b5] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white flex items-center justify-center transition-all shadow-md shrink-0"
          title="Send message"
          aria-label="Send message"
        >
          <Send className="w-4 h-4 -ml-0.5" />
        </button>
      </div>
    </div>
  );
};
