// Supabaseを使用したリポジトリ
// 環境変数が設定されていればSupabase、なければin-memoryフォールバック

import type { Topic, Rally, Message } from '@/packages/shared/Types';
import { SupabaseRepositories } from './SupabaseRepositories';

// Supabaseが利用可能かチェック
const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// フォールバック用のin-memoryストレージ（開発環境でSupabase未設定の場合）
const topics = new Map<string, Topic>();
const rallies = new Map<string, Rally>();
const messages = new Map<string, Message>();
const idempotencyMap = new Map<string, { topicId: string; rallyIds: string[] }>();

// In-memory版の実装
const InMemoryRepositories = {
  async createTopic(input: Omit<Topic, 'createdAt' | 'updatedAt'>): Promise<Topic> {
    const now = new Date().toISOString();
    const topic: Topic = { ...input, createdAt: now, updatedAt: now };
    topics.set(topic.id, topic);
    console.log('[InMemory] Created topic:', topic.id);
    return topic;
  },

  async getTopic(id: string): Promise<Topic | undefined> {
    return topics.get(id);
  },

  async listTopics(): Promise<Topic[]> {
    return Array.from(topics.values()).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  },

  async createRally(rally: Rally): Promise<Rally> {
    rallies.set(rally.id, rally);
    console.log('[InMemory] Created rally:', rally.id);
    return rally;
  },

  async listRalliesByTopicId(topicId: string): Promise<Rally[]> {
    return Array.from(rallies.values())
      .filter(r => r.topicId === topicId)
      .sort((a, b) => a.index - b.index);
  },

  async createMessage(message: Message): Promise<Message> {
    messages.set(message.id, message);
    return message;
  },

  async listMessagesByRallyId(rallyId: string): Promise<Message[]> {
    return Array.from(messages.values())
      .filter(m => m.rallyId === rallyId)
      .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  },

  async listMessagesByTopicId(topicId: string): Promise<Message[]> {
    const topicRallies = await this.listRalliesByTopicId(topicId);
    const rallyIds = topicRallies.map(r => r.id);
    return Array.from(messages.values())
      .filter(m => rallyIds.includes(m.rallyId))
      .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  },

  async updateMessage(message: Message): Promise<void> {
    messages.set(message.id, message);
  },

  async updateMessageImageUrls(messageId: string, imageUrls: string[], resolvedImageUrls: string[]): Promise<void> {
    const msg = messages.get(messageId);
    if (!msg) return;
    if (!msg.metadata) msg.metadata = {};
    (msg.metadata as any).imageUrls = imageUrls;
    (msg.metadata as any).resolvedImageUrls = resolvedImageUrls;
    messages.set(messageId, msg);
  },

  async getIdempotency(key: string): Promise<{ topicId: string; rallyIds: string[] } | undefined> {
    return idempotencyMap.get(key);
  },

  async setIdempotency(key: string, result: { topicId: string; rallyIds: string[] }): Promise<void> {
    idempotencyMap.set(key, result);
  },
};

// Supabaseまたはin-memoryを選択
export const Repositories = useSupabase ? SupabaseRepositories : InMemoryRepositories;

console.log(`[Repositories] Using ${useSupabase ? 'Supabase' : 'InMemory'} storage`);
