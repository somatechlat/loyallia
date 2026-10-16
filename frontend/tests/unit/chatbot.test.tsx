/**
 * Unit tests for the Chatbot conversation lifecycle (Phase 1).
 *
 * The mount-restore logic must CONTINUE the server-side conversation after a
 * page reload instead of silently starting a new one, and the end/new actions
 * must talk to the backend session endpoints (/ai-chat/session/, /ai-chat/end/).
 */
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { full_name: 'Ana Test', role: 'OWNER', tenant_name: 'Negocio Test' },
  }),
}));

import { I18nProvider } from '@/lib/i18n';
import Chatbot from '@/components/chat/Chatbot';

type FakeResponse = { status: number; body?: unknown };

const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
let sessionResponse: FakeResponse = { status: 204 };
let endResponse: FakeResponse = { status: 200, body: { success: true, ended: true } };
let chatResponse: FakeResponse = {
  status: 200,
  body: { response: 'hola', context_id: 'ctx-active' },
};

function fakeRes({ status, body }: FakeResponse) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body ?? {},
  };
}

function lastBodyFor(urlPart: string): Record<string, unknown> {
  const call = [...fetchCalls].reverse().find((c) => c.url.includes(urlPart));
  return call ? JSON.parse(String(call.init?.body ?? '{}')) : {};
}

beforeEach(() => {
  fetchCalls.length = 0;
  sessionResponse = { status: 204 };
  endResponse = { status: 200, body: { success: true, ended: true } };
  chatResponse = { status: 200, body: { response: 'hola', context_id: 'ctx-active' } };
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const route = String(url);
      fetchCalls.push({ url: route, init });
      if (route.includes('/ai-chat/session/')) return fakeRes(sessionResponse);
      if (route.includes('/ai-chat/end/')) return fakeRes(endResponse);
      return fakeRes(chatResponse);
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderChatbot() {
  return render(
    <I18nProvider>
      <Chatbot />
    </I18nProvider>
  );
}

describe('Chatbot conversation lifecycle', () => {
  it('restores the server-side session on mount and offers to continue it', async () => {
    sessionResponse = { status: 200, body: { context_id: 'ctx-restore-1' } };
    renderChatbot();

    expect(await screen.findByText('Continuar')).toBeInTheDocument();
    const sessionCall = fetchCalls.find((c) => c.url.includes('/ai-chat/session/'));
    expect(sessionCall).toBeTruthy();
    expect(sessionCall!.url).toContain('/api/v1/tenants/me/ai-chat/session/');
  });

  it('starts fresh (no lifecycle UI) when the server has no active session', async () => {
    sessionResponse = { status: 204 };
    renderChatbot();

    await waitFor(() => {
      expect(fetchCalls.some((c) => c.url.includes('/ai-chat/session/'))).toBe(true);
    });
    expect(screen.queryByText('Continuar')).toBeNull();
    expect(screen.queryByText('Nueva conversación')).toBeNull();
    expect(screen.queryByText('Finalizar conversación')).toBeNull();
  });

  it('continues the restored conversation instead of starting a new one', async () => {
    sessionResponse = { status: 200, body: { context_id: 'ctx-restore-1' } };
    renderChatbot();

    fireEvent.click(await screen.findByText('Continuar'));
    fireEvent.change(screen.getByPlaceholderText('Pregunta lo que quieras…'), {
      target: { value: '¿Cómo van mis ventas?' },
    });
    fireEvent.click(document.getElementById('chatbot-send')!);

    await waitFor(() => {
      expect(fetchCalls.some((c) => c.url === '/api/chat')).toBe(true);
    });
    expect(lastBodyFor('/api/chat').context_id).toBe('ctx-restore-1');
  });

  it('ends the conversation server-side and shows the confirmation state', async () => {
    sessionResponse = { status: 200, body: { context_id: 'ctx-restore-1' } };
    renderChatbot();

    fireEvent.click(await screen.findByText('Continuar'));
    fireEvent.click(screen.getByText('Finalizar conversación'));

    await waitFor(() => {
      expect(lastBodyFor('/ai-chat/end/').context_id).toBe('ctx-restore-1');
    });
    const endCall = fetchCalls.find((c) => c.url.includes('/ai-chat/end/'))!;
    expect(endCall.init?.method).toBe('POST');
    expect(
      await screen.findByText('Conversación finalizada. ¡Gracias por usar el asistente!')
    ).toBeInTheDocument();
  });

  it('does not fake the ended state when the server teardown fails', async () => {
    sessionResponse = { status: 200, body: { context_id: 'ctx-restore-1' } };
    endResponse = { status: 500 };
    renderChatbot();

    fireEvent.click(await screen.findByText('Continuar'));
    fireEvent.click(screen.getByText('Finalizar conversación'));

    expect(
      await screen.findByText('No se pudo finalizar la conversación. Inténtelo de nuevo.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Conversación finalizada. ¡Gracias por usar el asistente!')
    ).toBeNull();
  });

  it('starts a new conversation after ending the restored session first', async () => {
    sessionResponse = { status: 200, body: { context_id: 'ctx-restore-1' } };
    renderChatbot();

    expect(await screen.findByText('Continuar')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Nueva conversación'));

    await waitFor(() => {
      expect(lastBodyFor('/ai-chat/end/').context_id).toBe('ctx-restore-1');
    });
    // Lifecycle bar is gone — the chat is back to a fresh conversation.
    expect(screen.queryByText('Continuar')).toBeNull();
  });
});
