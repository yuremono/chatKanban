import { NextResponse } from 'next/server';
import { Repositories } from '@/lib/db/Repositories';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json({ results: [] });
    }

    // 全トピックを取得
    const topics = await Repositories.listTopics();
    const results: Array<{
      topicId: string;
      topicTitle: string;
      rallyId: string;
      messageId: string;
      role: string;
      content: string;
      timestamp: string;
      model?: string;
    }> = [];

    // 各トピックのメッセージを検索
    for (const topic of topics) {
      const rallies = await Repositories.listRalliesByTopicId(topic.id);
      
      for (const rally of rallies) {
        const messages = await Repositories.listMessagesByRallyId(rally.id);
        
        // 検索クエリに一致するメッセージを抽出
        for (const message of messages) {
          if (message.content && message.content.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              topicId: topic.id,
              topicTitle: topic.chatTitle || topic.title,
              rallyId: rally.id,
              messageId: message.id,
              role: message.role,
              content: message.content,
              timestamp: message.timestamp,
              model: message.model
            });
          }
        }
      }
    }

    return NextResponse.json({ results, query, count: results.length });
  } catch (e: any) {
    console.error('Search API error:', e);
    return NextResponse.json({ error: e?.message || 'Search failed' }, { status: 500 });
  }
}

