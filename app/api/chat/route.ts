import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    const { message, history = [] } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // GPT-4o-miniを使用（コストパフォーマンスが高い）
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたはChat Kanbanアプリケーションのアシスタントです。ユーザーのチャット履歴管理をサポートし、質問に親切に答えてください。'
        },
        ...history.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = completion.choices[0]?.message?.content || 'すみません、応答を生成できませんでした。';

    return NextResponse.json({
      reply,
      usage: completion.usage,
      model: completion.model
    });
  } catch (e: any) {
    console.error('Chat API error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Chat failed',
      details: e?.response?.data || null
    }, { status: 500 });
  }
}

