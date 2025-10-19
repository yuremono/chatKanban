import { NextResponse } from 'next/server';
import { Repositories } from '@/lib/db/Repositories';

export const runtime = 'nodejs';

type Body = {
  topicId?: string;
  replace: { from: string; to: string }[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!Array.isArray(body?.replace) || body.replace.length === 0) {
      return NextResponse.json({ error: 'replace array required' }, { status: 400 });
    }

    const topics = body.topicId ? (await Repositories.listTopics()).filter(t => t.id === body.topicId) : await Repositories.listTopics();
    let updated = 0;
    for (const t of topics) {
      const rallies = await Repositories.listRalliesByTopicId(t.id);
      for (const r of rallies) {
        const msgs = await Repositories.listMessagesByRallyId(r.id);
        for (const m of msgs) {
          const meta: any = m.metadata || {};
          const urls: string[] = Array.isArray(meta.imageUrls) ? meta.imageUrls : [];
          if (!urls.length) continue;
          let changed = false;
          const replaced = urls.map(u => {
            const hit = body.replace.find(x => x.from === u);
            if (hit && hit.to && hit.to !== u) { changed = true; return hit.to; }
            return u;
          });
          if (changed) {
            const next = { ...m, metadata: { ...meta, imageUrls: replaced, resolvedImageUrls: replaced } } as any;
            await Repositories.updateMessage(next);
            updated += 1;
          }
        }
      }
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'replace-image-urls failed' }, { status: 500 });
  }
}


