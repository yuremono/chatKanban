// 将来: Supabase/PostgreSQL実装へ差し替え。
// MVPではインメモリ＋ローカルJSON永続化（開発用）。

import type { Topic, Rally, Message } from '@/packages/shared/Types';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const topics = new Map<string, Topic>();
const rallies = new Map<string, Rally>();
const messages = new Map<string, Message>();
const idempotencyMap = new Map<string, { topicId: string; rallyIds: string[] }>();

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

type DbShape = {
  topics: Topic[];
  rallies: Rally[];
  messages: Message[];
};

async function ensureLoaded() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const buf = await fs.readFile(DB_FILE, 'utf8').catch(() => '');
    if (!buf) return;
    const json: DbShape = JSON.parse(buf);
    topics.clear(); rallies.clear(); messages.clear();
    for (const t of json.topics || []) topics.set(t.id, t);
    for (const r of json.rallies || []) rallies.set(r.id, r);
    for (const m of json.messages || []) messages.set(m.id, m);
  } catch {}
}

async function persist() {
  try {
    const json: DbShape = {
      topics: Array.from(topics.values()),
      rallies: Array.from(rallies.values()),
      messages: Array.from(messages.values()),
    };
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(json));
  } catch {}
}

export const Repositories = {
  async createTopic(input: Omit<Topic, 'createdAt' | 'updatedAt'>): Promise<Topic> {
    await ensureLoaded();
    const now = new Date().toISOString();
    const topic: Topic = { ...input, createdAt: now, updatedAt: now };
    topics.set(topic.id, topic);
    await persist();
    return topic;
  },

  async getTopic(id: string): Promise<Topic | undefined> {
    await ensureLoaded();
    return topics.get(id);
  },

  async listTopics(): Promise<Topic[]> {
    await ensureLoaded();
    return Array.from(topics.values()).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  },

  async listRalliesByTopicId(topicId: string): Promise<Rally[]> {
    await ensureLoaded();
    return Array.from(rallies.values())
      .filter(r => r.topicId === topicId)
      .sort((a, b) => a.index - b.index);
  },

  async listMessagesByRallyId(rallyId: string): Promise<Message[]> {
    await ensureLoaded();
    return Array.from(messages.values())
      .filter(m => m.rallyId === rallyId)
      .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  },

  async createRally(input: Omit<Rally, 'createdAt'>): Promise<Rally> {
    await ensureLoaded();
    const now = new Date().toISOString();
    const rally: Rally = { ...input, createdAt: now };
    rallies.set(rally.id, rally);
    await persist();
    return rally;
  },

  async createMessage(input: Message): Promise<Message> {
    messages.set(input.id, input);
    await persist();
    return input;
  },

  async updateMessage(input: Message): Promise<Message> {
    await ensureLoaded();
    messages.set(input.id, input);
    await persist();
    return input;
  },

  async listMessagesByTopicId(topicId: string): Promise<Message[]> {
    await ensureLoaded();
    const rallyIds = Array.from(rallies.values()).filter(r => r.topicId === topicId).map(r => r.id);
    return Array.from(messages.values()).filter(m => rallyIds.includes(m.rallyId));
  },

  async setIdempotency(key: string, value: { topicId: string; rallyIds: string[] }) {
    idempotencyMap.set(key, value);
  },
  async getIdempotency(key: string): Promise<{ topicId: string; rallyIds: string[] } | undefined> {
    return idempotencyMap.get(key);
  },
};


