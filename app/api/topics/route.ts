import { NextResponse } from 'next/server';
import { Repositories } from '@/lib/db/Repositories';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const topics = await Repositories.listTopics();
    return NextResponse.json({ topics });
  } catch (e: any) {
    console.error('Topics API error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to fetch topics' }, { status: 500 });
  }
}


