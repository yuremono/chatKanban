import { NextResponse } from 'next/server';
import { Repositories } from '@/lib/db/Repositories';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get('topicId');
  if (!topicId) return NextResponse.json({ error: 'topicId required' }, { status: 400 });
  const rallies = await Repositories.listRalliesByTopicId(topicId);
  return NextResponse.json({ rallies });
}


