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
      return NextResponse.json({ error: 'El mensaje es obligatorio' }, { status: 400 });
    }

    // Keep this cap aligned with the backend schema limit
    // (backend/apps/tenants/schemas.py → AIChatIn.message max_length=8000).
    // The two caps MUST match: a tighter edge cap silently truncates the
    // data-heavy page context that broke the chatbot on analytics pages.
    const MAX_MESSAGE_CHARS = 8000;
    if (message.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json(
        { error: `Mensaje demasiado largo (máximo ${MAX_MESSAGE_CHARS} caracteres)` },
        { status: 400 }
      );
    }

    const sanitizedMessage = message
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();

    if (!sanitizedMessage) {
      return NextResponse.json({ error: 'Message is empty after sanitization' }, { status: 400 });
    }

    // Server-side route: the backend MUST be resolved through the internal
    // compose network. NEXT_PUBLIC_API_URL is the host-published address
    // (browser-facing) and is unreachable from inside the web container —
    // it remains the fallback for non-compose deployments (e.g. production).
    const backendUrl = process.env.NEXT_INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Backend URL not configured' },
        { status: 500 }
      );
    }
    const authHeader = req.headers.get('Authorization') || '';

    const payload: Record<string, unknown> = {
      message: sanitizedMessage,
    };

    if (context_id && typeof context_id === 'string' && context_id.length <= 128) {
      // Must match the backend AIChatIn.context_id cap (max_length=128).
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
