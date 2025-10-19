import { NextResponse } from 'next/server';
import { Repositories } from '@/lib/db/Repositories';
import { resolveImageUrls } from '@/lib/images/ImageResolver';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { topicId } = await req.json();
    if (!topicId) return NextResponse.json({ error: 'topicId required' }, { status: 400 });

    const rallies = await Repositories.listRalliesByTopicId(topicId);
    const rallyIds = rallies.map(r => r.id);
    const messages = (await Promise.all(rallyIds.map(id => Repositories.listMessagesByRallyId(id)))).flat();

    let updated = 0;
    for (const m of messages) {
      const meta = m?.metadata || {};
      const dataUrls: string[] = Array.isArray(meta.imageDataUrls) ? meta.imageDataUrls : [];
      const urls: string[] = Array.isArray(meta.imageUrls) ? meta.imageUrls : [];
      if (dataUrls.length > 0) continue; // dataURLがあるならスキップ
      if (urls.length === 0) continue;
      const resolved = await resolveImageUrls(urls, { referer: 'https://gemini.google.com/' });
      if (resolved.length > 0) {
        const next = { ...m, metadata: { ...meta, imageUrls: resolved, resolvedImageUrls: resolved } };
        await Repositories.updateMessage(next as any);
        updated += 1;
      }
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'migrate failed' }, { status: 500 });
  }
}


