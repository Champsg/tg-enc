export type MessageType = 'text' | 'file' | 'audio' | 'reaction' | 'typing' | 'status' | 'wipe';

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
}

export interface EncryptedFileMetadata {
  fileName: string;
  mimeType: string;
  fileSize: number;
  duration?: number; // for audio
  width?: number; // for images
  height?: number; // for images
}

export interface EncryptedEnvelope {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  type: MessageType;
  payload?: EncryptedPayload;
  metadata?: EncryptedFileMetadata;
  replyToId?: string;
  reactionEmoji?: string;
  targetMessageId?: string;
  timestamp: number;
}

export interface DecryptedMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  type: 'text' | 'file' | 'audio';
  content: string; // text content or base64 file preview data URL
  fileBlobUrl?: string; // object URL for download / playback
  fileMetadata?: EncryptedFileMetadata;
  replyToId?: string;
  replySnippet?: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  reactions: Record<string, string[]>; // emoji -> array of sender names
}

export interface UserSession {
  userId: string;
  username: string;
  roomId: string;
  roomPasskey: string;
  safetyNumber: string;
  isHost: boolean;
}

export interface PeerState {
  id: string;
  name: string;
  isTyping: boolean;
  isOnline: boolean;
  lastSeen: number;
}
