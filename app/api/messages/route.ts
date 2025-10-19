import { NextResponse } from 'next/server';
import { Repositories } from '@/lib/db/Repositories';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rallyId = searchParams.get('rallyId');
    const topicId = searchParams.get('topicId');

    if (!rallyId && !topicId) {
      return NextResponse.json({ error: 'rallyId or topicId required' }, { status: 400 });
    }

    if (rallyId) {
      const messages = await Repositories.listMessagesByRallyId(rallyId);
      const enriched = enrichWithImageUrls(messages);
      return NextResponse.json({ messages: enriched });
    }

    const topicRallies = await Repositories.listRalliesByTopicId(topicId!);
    const rallyIds = topicRallies.map(r => r.id);
    const messages = (await Promise.all(rallyIds.map(id => Repositories.listMessagesByRallyId(id)))).flat();
    const enriched = enrichWithImageUrls(messages);
    return NextResponse.json({ messages: enriched });
  } catch (e: any) {
    console.error('Messages API error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to fetch messages' }, { status: 500 });
  }
}

function enrichWithImageUrls(messages: any[]) {
  // 本番環境では、既に保存されている画像URLをそのまま返す
  // （Supabase StorageのURLは既にmetadata.imageUrlsに含まれている）
  return messages.map((m) => {
    const meta = m?.metadata || {};
    const urls: string[] = Array.isArray(meta.imageUrls) ? meta.imageUrls : [];
    return {
      ...m,
      metadata: {
        ...meta,
        resolvedImageUrls: urls, // 既存のimageUrlsをそのまま使用
      },
    };
  });
}


