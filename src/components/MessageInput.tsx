import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Send,
  Mic,
  Smile,
  X,
  Trash2,
  Check,
} from 'lucide-react';
import { VoiceRecorder } from '../utils/audio.ts';
import type { DecryptedMessage } from '../types/chat.ts';

interface MessageInputProps {
  onSendMessage: (text: string, replyToId?: string) => void;
  onSendFile: (file: File, replyToId?: string) => void;
  onSendVoiceNote: (audioBlob: Blob, duration: number, replyToId?: string) => void;
  onTyping: (isTyping: boolean) => void;
  replyTo: DecryptedMessage | null;
  onCancelReply: () => void;
  disabled?: boolean;
}

const EMOJI_LIST = [
  '😊', '😂', '🔥', '❤️', '👍', '🙏', '👏', '🎉',
  '😎', '🤫', '🔒', '🔑', '👀', '🚀', '✨', '⚡',
  '☕', '🍕', '🍻', '💯', '🤔', '🙌', '💪', '🤝'
];

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendFile,
  onSendVoiceNote,
  onTyping,
  replyTo,
  onCancelReply,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollH, 120)}px`;
    }
  }, [text]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Debounced typing status
    onTyping(true);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      onTyping(false);
    }, 1800);
  };

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSendMessage(text.trim(), replyTo?.id);
    setText('');
    onTyping(false);
    if (replyTo) onCancelReply();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendFile(file, replyTo?.id);
      if (replyTo) onCancelReply();
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startVoiceRecording = async () => {
    try {
      const recorder = new VoiceRecorder();
      await recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      alert((err as Error).message || 'Unable to access microphone.');
    }
  };

  const cancelVoiceRecording = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const completeVoiceRecording = async () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (recorderRef.current) {
      try {
        const { blob, duration } = await recorderRef.current.stop();
        onSendVoiceNote(blob, duration, replyTo?.id);
        if (replyTo) onCancelReply();
      } catch (err) {
        console.error('Failed to save voice recording:', err);
      }
      recorderRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const addEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const formatRecordTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#17212b] border-t border-[#242f3d] p-3 relative select-none">
      {/* Reply Quote Banner */}
      {replyTo && (
        <div className="flex items-center justify-between bg-[#202b36] border-l-3 border-[#2481cc] px-3 py-1.5 rounded-r-lg mb-2 text-xs">
          <div className="min-w-0 pr-2">
            <span className="font-semibold text-[#54a9eb] block text-[11px]">
              Replying to {replyTo.senderName}
            </span>
            <p className="text-slate-300 truncate text-[11px]">
              {replyTo.content || replyTo.fileMetadata?.fileName || 'Attachment'}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="text-slate-400 hover:text-white p-1 transition-colors"
            title="Cancel reply"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Emoji Popup Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 z-30 bg-[#17212b] border border-[#2b394a] rounded-xl p-2 shadow-2xl grid grid-cols-8 gap-1.5 w-72">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addEmoji(emoji)}
              className="text-xl p-1 hover:bg-[#202b36] rounded-md transition-transform hover:scale-115"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Main Bar */}
      <div className="flex items-end gap-2 max-w-5xl mx-auto">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,audio/*,video/*,application/pdf,application/zip,text/*"
        />

        {isRecording ? (
          // Active Voice Recording Bar
          <div className="flex-1 flex items-center justify-between bg-[#202b36] rounded-2xl px-4 py-2 border border-[#2b394a] animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-mono font-medium text-white">
                Recording {formatRecordTime(recordingSeconds)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={cancelVoiceRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-medium transition-colors"
                title="Cancel voice note"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>

              <button
                onClick={completeVoiceRecording}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2481cc] hover:bg-[#2072b5] text-white text-xs font-medium transition-colors shadow-sm"
                title="Send voice note"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        ) : (
          // Normal Typing Input Bar
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="p-2.5 text-slate-400 hover:text-[#54a9eb] hover:bg-[#202b36] rounded-full transition-colors shrink-0"
              title="Attach encrypted file or photo"
              aria-label="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <div className="flex-1 flex items-end bg-[#202b36] rounded-2xl border border-[#2b394a] focus-within:border-[#2481cc] transition-colors px-3 py-1.5">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Write an encrypted message..."
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

            {text.trim().length > 0 ? (
              <button
                type="button"
                onClick={handleSend}
                disabled={disabled}
                className="w-10 h-10 rounded-full bg-[#2481cc] hover:bg-[#2072b5] active:scale-95 text-white flex items-center justify-center transition-all shadow-md shrink-0 cursor-pointer"
                title="Send message"
                aria-label="Send message"
              >
                <Send className="w-4 h-4 -ml-0.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startVoiceRecording}
                disabled={disabled}
                className="w-10 h-10 rounded-full bg-[#202b36] hover:bg-[#2481cc] hover:text-white text-slate-300 flex items-center justify-center transition-all shrink-0 cursor-pointer border border-[#2b394a]"
                title="Record voice note"
                aria-label="Record voice note"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
