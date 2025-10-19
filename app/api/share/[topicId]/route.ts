import { NextResponse } from 'next/server';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;
  // TODO: 署名トークン生成、TTL処理
  const token = `stub-token-${topicId}`;
  return NextResponse.json({ token, url: `/share/${topicId}?t=${token}` });
}


