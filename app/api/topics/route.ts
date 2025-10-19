import { NextResponse } from 'next/server';
import { Repositories } from '@/lib/db/Repositories';

export async function GET() {
  const topics = await Repositories.listTopics();
  return NextResponse.json({ topics });
}


