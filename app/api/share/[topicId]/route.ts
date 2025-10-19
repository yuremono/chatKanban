import { NextResponse } from 'next/server';

type Params = { params: { topicId: string } };

export async function POST(_req: Request, { params }: Params) {
  // TODO: 署名トークン生成、TTL処理
  const token = `stub-token-${params.topicId}`;
  return NextResponse.json({ token, url: `/share/${params.topicId}?t=${token}` });
}


