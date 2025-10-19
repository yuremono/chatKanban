import { NextResponse } from 'next/server';
import { Repositories } from '@/lib/db/Repositories';
import { resolveImageUrls } from '@/lib/images/ImageResolver';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const topics = await Repositories.listTopics();
    let updated = 0;
    for (const t of topics) {
      const rallies = await Repositories.listRalliesByTopicId(t.id);
      const messages = (await Promise.all(rallies.map(r => Repositories.listMessagesByRallyId(r.id)))).flat();
      for (const m of messages) {
        const meta = (m as any)?.metadata || {};
        const dataUrls: string[] = Array.isArray(meta.imageDataUrls) ? meta.imageDataUrls : [];
        const urls: string[] = Array.isArray(meta.imageUrls) ? meta.imageUrls : [];
        if (dataUrls.length > 0 || urls.length === 0) continue;
        const resolved = await resolveImageUrls(urls, { referer: 'https://gemini.google.com/' });
        if (resolved.length > 0) {
          const next = { ...m, metadata: { ...meta, imageUrls: resolved, resolvedImageUrls: resolved } };
          await Repositories.updateMessage(next as any);
          updated += 1;
        }
      }
    }
    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'migrate-all failed' }, { status: 500 });
  }
}


