export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface DecryptedMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  replyToId?: string;
  replySnippet?: string;
  timestamp: number;
  status: MessageStatus;
  reactions: Record<string, string[]>; // emoji -> display names
}

export type Message = DecryptedMessage;

export interface UserProfile {
  userId: string;
  username: string;
  displayName: string;
  email?: string;
}

export interface LocalIdentity {
  userId: string;
  username: string;
  displayName: string;
  email?: string;
  createdAt: number;
}

export interface ChatSummary {
  chatId: string;
  peerId: string;
  peerUsername: string;
  peerName: string;
  updatedAt: number;
  lastMessage?: string;
  unread?: boolean;
}

export interface PeerState {
  id: string;
  name: string;
  isTyping: boolean;
  isOnline: boolean;
  lastSeen: number;
}
