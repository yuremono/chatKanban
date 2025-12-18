import { NextResponse } from 'next/server';
import { Repositories } from '@/lib/db/Repositories';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const topics = await Repositories.listTopics();
    
    // 最適化：全トピックのralliesを一括取得（Supabaseの場合）
    const topicIds = topics.map(t => t.id);
    let allRallies: any[] = [];
    let allMessages: any[] = [];
    
    // SupabaseRepositoriesに一括取得メソッドがある場合は使用
    if ('listRalliesByTopicIds' in Repositories) {
      allRallies = await (Repositories as any).listRalliesByTopicIds(topicIds);
      const rallyIds = allRallies.map(r => r.id);
      
      if (rallyIds.length > 0 && 'listMessagesByRallyIds' in Repositories) {
        allMessages = await (Repositories as any).listMessagesByRallyIds(rallyIds);
      }
    } else {
      // フォールバック：従来の並列化処理
      const ralliesByTopic = await Promise.all(
        topics.map(t => Repositories.listRalliesByTopicId(t.id))
      );
      allRallies = ralliesByTopic.flat();
      const rallyIds = allRallies.map(r => r.id);
      
      if (rallyIds.length > 0) {
        const messagesByRally = await Promise.all(
          rallyIds.map(id => Repositories.listMessagesByRallyId(id))
        );
        allMessages = messagesByRally.flat();
      }
    }
    
    // トピックごとにralliesとmessagesをグループ化
    const payload = topics.map(t => {
      const rallies = allRallies.filter(r => r.topicId === t.id);
      const rallyIds = rallies.map(r => r.id);
      const messages = allMessages.filter(m => rallyIds.includes(m.rallyId));
      return { topic: t, rallies, messages };
    });

    return NextResponse.json({ exportedAt: new Date().toISOString(), data: payload });
  } catch (e: any) {
    console.error('Export API error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to export data' }, { status: 500 });
  }
}


