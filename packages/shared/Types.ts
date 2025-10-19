export type Visibility = 'private' | 'unlisted' | 'public';

export type User = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  provider: 'google';
  providerUserId: string;
  createdAt: string;
};

export type Topic = {
  id: string;
  userId: string;
  title: string;
  tags: string[];
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  userName?: string;
  chatTitle?: string;
  model?: string;
};

export type Rally = {
  id: string;
  topicId: string;
  index: number;
  createdAt?: string; // Supabaseで自動生成されるため省略可能
};

export type MessageRole = 'user' | 'assistant' | 'system';

export type Message = {
  id: string;
  rallyId: string;
  role: MessageRole;
  content: string; // markdown
  model: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type ShareLink = {
  id: string;
  topicId: string;
  token: string;
  expiresAt?: string | null;
  createdAt: string;
};


