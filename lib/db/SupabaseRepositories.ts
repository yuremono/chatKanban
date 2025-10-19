// Supabase を使った永続化ストレージ
import { supabase } from './supabase';
import type { Topic, Rally, Message } from '@/packages/shared/Types';

export const SupabaseRepositories = {
  // Topics
  async createTopic(input: Omit<Topic, 'createdAt' | 'updatedAt'>): Promise<Topic> {
    const now = new Date().toISOString();
    const topic: Topic = { ...input, createdAt: now, updatedAt: now };
    
    const { data, error } = await supabase
      .from('chatkanban_topics')
      .insert(topic)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getTopic(id: string): Promise<Topic | undefined> {
    const { data, error } = await supabase
      .from('chatkanban_topics')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return undefined;
    return data;
  },

  async listTopics(): Promise<Topic[]> {
    const { data, error } = await supabase
      .from('chatkanban_topics')
      .select('*')
      .order('updatedAt', { ascending: false });
    
    if (error) return [];
    return data || [];
  },

  // Rallies
  async createRally(rally: Rally): Promise<Rally> {
    const { data, error } = await supabase
      .from('chatkanban_rallies')
      .insert(rally)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async listRalliesByTopicId(topicId: string): Promise<Rally[]> {
    const { data, error } = await supabase
      .from('chatkanban_rallies')
      .select('*')
      .eq('topicId', topicId)
      .order('index', { ascending: true });
    
    if (error) return [];
    return data || [];
  },

  // Messages
  async createMessage(message: Message): Promise<Message> {
    const { data, error } = await supabase
      .from('chatkanban_messages')
      .insert(message)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async listMessagesByRallyId(rallyId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('chatkanban_messages')
      .select('*')
      .eq('rallyId', rallyId)
      .order('timestamp', { ascending: true });
    
    if (error) return [];
    return data || [];
  },

  async listMessagesByTopicId(topicId: string): Promise<Message[]> {
    // topicIdからralliesを取得し、そのralliesのmessagesを取得
    const rallies = await this.listRalliesByTopicId(topicId);
    const rallyIds = rallies.map(r => r.id);
    
    if (rallyIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('chatkanban_messages')
      .select('*')
      .in('rallyId', rallyIds)
      .order('timestamp', { ascending: true });
    
    if (error) return [];
    return data || [];
  },

  async updateMessage(message: Message): Promise<void> {
    await supabase
      .from('chatkanban_messages')
      .update(message)
      .eq('id', message.id);
  },

  async updateMessageImageUrls(messageId: string, imageUrls: string[], resolvedImageUrls: string[]): Promise<void> {
    const { data, error } = await supabase
      .from('chatkanban_messages')
      .select('metadata')
      .eq('id', messageId)
      .single();
    
    if (error) return;
    
    const metadata = data.metadata || {};
    metadata.imageUrls = imageUrls;
    metadata.resolvedImageUrls = resolvedImageUrls;
    
    await supabase
      .from('chatkanban_messages')
      .update({ metadata })
      .eq('id', messageId);
  },

  // Idempotency
  async getIdempotency(key: string): Promise<{ topicId: string; rallyIds: string[] } | undefined> {
    const { data, error } = await supabase
      .from('chatkanban_idempotency')
      .select('*')
      .eq('key', key)
      .single();
    
    if (error) return undefined;
    return data.result;
  },

  async setIdempotency(key: string, result: { topicId: string; rallyIds: string[] }): Promise<void> {
    await supabase
      .from('chatkanban_idempotency')
      .upsert({ key, result });
  },
};

