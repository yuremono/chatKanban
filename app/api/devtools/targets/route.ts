import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BRIDGE_PORT = Number(process.env.MCP_PORT || '7779');

export async function POST() {
  try {
    const res = await fetch(`http://localhost:${BRIDGE_PORT}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'targets' }),
      cache: 'no-store',
    });
    const json = await res.json();
    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'targets failed' }, { status: 500 });
  }
}


