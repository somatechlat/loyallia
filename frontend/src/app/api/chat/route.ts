import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, context_id } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const payload: any = {
      message,
      lifetime_hours: 24,
    };

    if (context_id) {
      payload.context_id = context_id;
    }

    const response = await fetch('https://agente.ingelsi.com.ec/api_message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': 'C5ZfFYI-QOxHsMuJ',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch from AI agent' },
        { status: response.status }
      );
    }
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while contacting AI agent' },
      { status: 500 }
    );
  }
}
