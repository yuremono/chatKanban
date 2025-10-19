import { NextResponse } from 'next/server';
import { Repositories } from '@/lib/db/Repositories';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return withCors(NextResponse.json({ ok: true }));
}

type FileEntry = { filename: string; url: string };

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const files: FileEntry[] = Array.isArray(body?.files) ? body.files : [];
    if (files.length === 0) return withCors(NextResponse.json({ error: 'files required' }, { status: 400 }));

    // グルーピング: <topicId>_<NNN>.*
    const byTopic = new Map<string, { index: number; url: string }[]>();
    const re = /^(.+?)_(\d{3})\.[a-z0-9]+$/i;
    for (const f of files) {
      const name = String(f.filename || '').trim();
      const m = re.exec(name);
      if (!m) continue;
      const topicId = m[1];
      const idx = parseInt(m[2], 10);
      if (!byTopic.has(topicId)) byTopic.set(topicId, []);
      byTopic.get(topicId)!.push({ index: idx, url: f.url });
    }

    const results: any[] = [];
    for (const [topicId, list] of byTopic) {
      list.sort((a, b) => a.index - b.index);
      // トピック内で最初のassistantメッセージを取得（なければ作成）
      const messages = await Repositories.listMessagesByTopicId(topicId);
      let target = messages.find(m => m.role === 'assistant');
      if (!target) {
        // 最初のラリーに空assistantを作成
        const rallies = await Repositories.listRalliesByTopicId(topicId);
        const rallyId = rallies[0]?.id || `rally_${topicId}_0`;
        target = {
          id: `${rallyId}_${Math.random().toString(36).slice(2)}`,
          rallyId,
          role: 'assistant',
          content: '',
          model: 'unknown',
          timestamp: new Date().toISOString(),
          metadata: {},
        } as any;
      }
      const urls = list.map(x => x.url);
      const meta = Object.assign({}, target.metadata || {});
      (meta as any).imageUrls = urls;
      (meta as any).resolvedImageUrls = urls;
      target.metadata = meta as any;

      await Repositories.updateMessage(target);
      results.push({ topicId, count: urls.length });
    }

    return withCors(NextResponse.json({ ok: true, results }));
  } catch (e: any) {
    return withCors(NextResponse.json({ error: e?.message || 'assign failed' }, { status: 500 }));
  }
}

function withCors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}


