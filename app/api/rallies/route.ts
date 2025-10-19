import { NextResponse } from 'next/server';
import { Repositories } from '@/lib/db/Repositories';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('topicId');
    if (!topicId) return NextResponse.json({ error: 'topicId required' }, { status: 400 });
    const rallies = await Repositories.listRalliesByTopicId(topicId);
    return NextResponse.json({ rallies });
  } catch (e: any) {
    console.error('Rallies API error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to fetch rallies' }, { status: 500 });
  }
}


