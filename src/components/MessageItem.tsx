import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  CheckCheck,
  Download,
  FileText,
  Play,
  Pause,
  Reply,
  Smile,
  Lock,
} from 'lucide-react';
import type { DecryptedMessage } from '../types/chat.ts';

interface MessageItemProps {
  message: DecryptedMessage;
  isMe: boolean;
  onReply: (msg: DecryptedMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onImageClick: (imgUrl: string, name?: string) => void;
}

const COMMON_EMOJIS = ['❤️', '👍', '🔥', '👏', '😂'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isMe,
  onReply,
  onReact,
  onImageClick,
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(message.fileMetadata?.duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (message.type === 'audio' && message.fileBlobUrl) {
      const audio = new Audio(message.fileBlobUrl);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setAudioDuration(Math.round(audio.duration));
        }
      };

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setIsPlayingAudio(false);
        setAudioProgress(0);
      };

      return () => {
        audio.pause();
        audioRef.current = null;
      };
    }
  }, [message.type, message.fileBlobUrl]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch((e) => {
        console.error('Playback error:', e);
      });
    }
  };

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isImage = message.fileMetadata?.mimeType?.startsWith('image/');

  return (
    <div
      className={`relative group flex flex-col my-1.5 px-2 ${
        isMe ? 'items-end' : 'items-start'
      }`}
      onMouseLeave={() => setShowReactions(false)}
    >
      {/* Quick Action Floating Bar on Hover */}
      <div
        className={`absolute -top-7 ${
          isMe ? 'right-2' : 'left-2'
        } z-20 hidden group-hover:flex items-center gap-1 bg-[#17212b] border border-[#2b394a] rounded-full p-1 shadow-md`}
      >
        <button
          onClick={() => onReply(message)}
          className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-[#202b36] transition-colors"
          title="Reply to message"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setShowReactions(!showReactions)}
          className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-[#202b36] transition-colors"
          title="React with emoji"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Reactions Picker */}
      {showReactions && (
        <div
          className={`absolute -top-10 ${
            isMe ? 'right-0' : 'left-0'
          } z-30 flex items-center gap-1 bg-[#17212b] border border-[#2b394a] rounded-full px-2 py-1 shadow-lg animate-in fade-in duration-150`}
        >
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact(message.id, emoji);
                setShowReactions(false);
              }}
              className="text-base hover:scale-125 transition-transform p-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Message Bubble Container */}
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl shadow-sm text-sm overflow-hidden select-text transition-colors ${
          isMe
            ? 'bg-[#2b5278] text-[#f5f5f5] rounded-tr-xs'
            : 'bg-[#182533] text-[#f5f5f5] rounded-tl-xs'
        }`}
      >
        {/* Reply Quote Banner if any */}
        {message.replySnippet && (
          <div className="mx-3 mt-2.5 mb-1 p-2 rounded-md bg-black/20 border-l-2 border-[#54a9eb] text-xs">
            <span className="font-semibold text-[#54a9eb] block text-[11px]">
              Replied message
            </span>
            <p className="text-slate-300 truncate text-[11px]">
              {message.replySnippet}
            </p>
          </div>
        )}

        {/* Sender Name for incoming messages */}
        {!isMe && (
          <div className="px-3 pt-2 text-[11px] font-semibold text-[#54a9eb]">
            {message.senderName}
          </div>
        )}

        {/* Message Content Type 1: Image */}
        {message.type === 'file' && isImage && (
          <div className="p-1">
            <div
              onClick={() => onImageClick(message.content, message.fileMetadata?.fileName)}
              className="relative rounded-xl overflow-hidden cursor-pointer group/img max-h-80 bg-black/20"
            >
              <img
                src={message.content}
                alt={message.fileMetadata?.fileName || 'Encrypted Image'}
                className="w-full h-auto max-h-80 object-cover hover:opacity-95 transition-opacity"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-xs font-medium text-white bg-black/60 px-2.5 py-1 rounded-full">
                  Click to view full photo
                </span>
              </div>
            </div>
            {message.fileMetadata?.fileName && (
              <p className="text-[11px] text-slate-300 px-2 pt-1 truncate">
                {message.fileMetadata.fileName}
              </p>
            )}
          </div>
        )}

        {/* Message Content Type 2: Document / Non-Image File */}
        {message.type === 'file' && !isImage && (
          <div className="p-3">
            <div className="flex items-center gap-3 bg-black/20 p-2.5 rounded-xl border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-[#2481cc]/30 flex items-center justify-center shrink-0 text-[#54a9eb]">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  {message.fileMetadata?.fileName || 'Encrypted File'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {message.fileMetadata?.fileSize
                    ? `${(message.fileMetadata.fileSize / 1024).toFixed(1)} KB`
                    : 'Encrypted document'}
                </p>
              </div>
              {message.fileBlobUrl && (
                <a
                  href={message.fileBlobUrl}
                  download={message.fileMetadata?.fileName || 'encrypted_attachment'}
                  className="p-2 rounded-lg bg-[#2481cc] hover:bg-[#2072b5] text-white transition-colors shrink-0"
                  title="Download decrypted file"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Message Content Type 3: Audio / Voice Memo */}
        {message.type === 'audio' && (
          <div className="p-3">
            <div className="flex items-center gap-3 min-w-[200px] sm:min-w-[240px]">
              <button
                onClick={toggleAudio}
                className="w-10 h-10 rounded-full bg-[#2481cc] hover:bg-[#2072b5] text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm"
                title={isPlayingAudio ? 'Pause voice message' : 'Play voice message'}
              >
                {isPlayingAudio ? (
                  <Pause className="w-4 h-4 fill-white" />
                ) : (
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                )}
              </button>

              <div className="flex-1 flex flex-col justify-center">
                {/* Simulated waveform bars */}
                <div className="h-6 flex items-center gap-1">
                  {[40, 70, 90, 50, 80, 100, 60, 45, 85, 95, 60, 40, 75, 55, 30].map(
                    (height, idx) => {
                      const active = audioProgress > (idx / 15) * 100;
                      return (
                        <div
                          key={idx}
                          style={{ height: `${Math.max(6, (height / 100) * 22)}px` }}
                          className={`w-1 rounded-full transition-colors ${
                            active ? 'bg-[#54a9eb]' : 'bg-white/30'
                          }`}
                        />
                      );
                    }
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono mt-0.5">
                  <span>Voice message</span>
                  <span>{audioDuration}s</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message Content Type 4: Text */}
        {message.type === 'text' && (
          <div className="px-3.5 py-2 leading-relaxed break-words whitespace-pre-wrap">
            {message.content}
          </div>
        )}

        {/* Bottom Metadata: Timestamp + Double checks */}
        <div className="flex items-center justify-end gap-1 px-3 pb-1.5 pt-0.5 select-none text-[10px] text-slate-300/80">
          <span>{formattedTime}</span>
          {isMe && (
            <span title={message.status === 'read' ? 'Read' : 'Delivered'}>
              {message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-[#54a9eb]" />
              ) : (
                <Check className="w-3.5 h-3.5 text-slate-400" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Emoji Reactions Tray */}
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
                <span className="text-[10px] text-slate-300 font-mono">
                  {users.length}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
