import { NextResponse } from 'next/server';
import { Repositories } from '@/lib/db/Repositories';

export async function GET() {
  const topics = await Repositories.listTopics();
  const payload = [] as Array<{
    topic: any;
    rallies: any[];
    messages: any[];
  }>;

  for (const t of topics) {
    const rallies = await Repositories.listRalliesByTopicId(t.id);
    const rallyIds = rallies.map(r => r.id);
    const messages = (await Promise.all(rallyIds.map(id => Repositories.listMessagesByRallyId(id)))).flat();
    payload.push({ topic: t, rallies, messages });
  }

  return NextResponse.json({ exportedAt: new Date().toISOString(), data: payload });
}


