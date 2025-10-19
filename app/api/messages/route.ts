import { NextResponse } from 'next/server';
import { Repositories } from '@/lib/db/Repositories';
import { resolveImageUrls } from '@/lib/images/ImageResolver';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rallyId = searchParams.get('rallyId');
  const topicId = searchParams.get('topicId');

  if (!rallyId && !topicId) {
    return NextResponse.json({ error: 'rallyId or topicId required' }, { status: 400 });
  }

  if (rallyId) {
    const messages = await Repositories.listMessagesByRallyId(rallyId);
    const enriched = await enrichWithResolvedImages(messages);
    // 永続化（resolvedImageUrlsが取れたものはDBも更新）
    await persistResolved(enriched);
    return NextResponse.json({ messages: enriched });
  }

  const topicRallies = await Repositories.listRalliesByTopicId(topicId!);
  const rallyIds = topicRallies.map(r => r.id);
  const messages = (await Promise.all(rallyIds.map(id => Repositories.listMessagesByRallyId(id)))).flat();
  const enriched = await enrichWithResolvedImages(messages);
  await persistResolved(enriched);
  return NextResponse.json({ messages: enriched });
}

async function enrichWithResolvedImages(messages: any[]) {
  // DataURLがあればそれを優先し、外部URLは可能なものだけ /uploads に解決して返す
  const jobs = messages.map(async (m) => {
    const meta = m?.metadata || {};
    const dataUrls: string[] = Array.isArray(meta.imageDataUrls) ? meta.imageDataUrls : [];
    const urls: string[] = Array.isArray(meta.imageUrls) ? meta.imageUrls : [];
    let resolved: string[] = [];
    if (urls.length > 0) {
      // Gemini想定のRefererをデフォルト付与
      resolved = await resolveImageUrls(urls, { referer: 'https://gemini.google.com/' });
    }
    return {
      ...m,
      metadata: {
        ...meta,
        resolvedImageUrls: resolved,
      },
    };
  });
  return await Promise.all(jobs);
}

async function persistResolved(messages: any[]) {
  const updates = messages.map(async (m) => {
    const meta = m?.metadata || {};
    const resolved: string[] = Array.isArray(meta.resolvedImageUrls) ? meta.resolvedImageUrls : [];
    if (resolved.length > 0) {
      const next = { ...m, metadata: { ...meta, imageUrls: resolved } };
      try { await Repositories.updateMessage(next as any); } catch {}
    }
  });
  await Promise.all(updates);
}


