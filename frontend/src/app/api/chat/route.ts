import { NextResponse } from 'next/server';
import { createRateLimiter, getClientIp, rateLimitHeaders } from '@/lib/security/rate-limiter';

const chatRateLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60 * 1000 });

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rlResult = chatRateLimiter.check(ip);
    if (!rlResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in a minute.' },
        { status: 429, headers: rateLimitHeaders(rlResult, 30) }
      );
    }

    const { message, context_id } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 });
    }

    const sanitizedMessage = message
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();

    if (!sanitizedMessage) {
      return NextResponse.json({ error: 'Message is empty after sanitization' }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const authHeader = req.headers.get('Authorization') || '';

    const payload: Record<string, unknown> = {
      message: sanitizedMessage,
    };

    if (context_id && typeof context_id === 'string' && context_id.length < 200) {
      payload.context_id = context_id;
    }

    const response = await fetch(`${backendUrl}/api/v1/tenants/me/ai-chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data, { headers: rateLimitHeaders(rlResult, 30) });
    } else {
      return NextResponse.json(
        { error: data.detail || data.error || 'Failed to fetch from AI agent' },
        { status: response.status }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Internal server error while contacting AI agent' },
      { status: 500 }
    );
  }
}
