// Vercel KV (Redis) を使った永続化ストレージ
import { kv } from '@vercel/kv';
import type { Topic, Rally, Message } from '@/packages/shared/Types';

const KV_TOPICS_KEY = 'chatkanban:topics';
const KV_RALLIES_KEY = 'chatkanban:rallies';
const KV_MESSAGES_KEY = 'chatkanban:messages';

export const VercelKVStore = {
  async getAllTopics(): Promise<Topic[]> {
    try {
      const data = await kv.get<Topic[]>(KV_TOPICS_KEY);
      return data || [];
    } catch (e) {
      console.error('KV get topics failed:', e);
      return [];
    }
  },

  async getAllRallies(): Promise<Rally[]> {
    try {
      const data = await kv.get<Rally[]>(KV_RALLIES_KEY);
      return data || [];
    } catch (e) {
      console.error('KV get rallies failed:', e);
      return [];
    }
  },

  async getAllMessages(): Promise<Message[]> {
    try {
      const data = await kv.get<Message[]>(KV_MESSAGES_KEY);
      return data || [];
    } catch (e) {
      console.error('KV get messages failed:', e);
      return [];
    }
  },

  async saveAllTopics(topics: Topic[]): Promise<void> {
    try {
      await kv.set(KV_TOPICS_KEY, topics);
    } catch (e) {
      console.error('KV save topics failed:', e);
    }
  },

  async saveAllRallies(rallies: Rally[]): Promise<void> {
    try {
      await kv.set(KV_RALLIES_KEY, rallies);
    } catch (e) {
      console.error('KV save rallies failed:', e);
    }
  },

  async saveAllMessages(messages: Message[]): Promise<void> {
    try {
      await kv.set(KV_MESSAGES_KEY, messages);
    } catch (e) {
      console.error('KV save messages failed:', e);
    }
  },
};

