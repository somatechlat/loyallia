'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';

/**
 * Represents a single chat message.
 */
type Message = {
  /** Unique message identifier */
  id: string;
  /** Role of the message sender */
  role: 'user' | 'assistant';
  /** Message text content */
  content: string;
};

function getLabel(p: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const labels: Record<string, string> = {
    '/': t('nav.dashboard'),
    '/programs': t('nav.programs'),
    '/customers': t('nav.customers'),
    '/analytics': t('nav.analytics'),
    '/automation': t('nav.automation'),
    '/campaigns': t('chatbot.pageLabel.campaigns'),
    '/billing': t('nav.billing'),
    '/settings': t('nav.settings'),
  };
  if (labels[p]) return labels[p];
  const prefix = '/' + p.split('/').filter(Boolean)[0];
  return labels[prefix] || 'Loyallia';
}

function getHints(p: string, t: (key: string, vars?: Record<string, string | number>) => string): string[] {
  const hints: Record<string, string[]> = {
    '/': [t('chatbot.hints.retention'), t('chatbot.hints.numbers'), t('chatbot.hints.trends')],
    '/programs': [t('chatbot.hints.whichProgram'), t('chatbot.hints.vipProgram')],
    '/customers': [t('chatbot.hints.segment'), t('chatbot.hints.recover')],
    '/analytics': [t('chatbot.hints.kpis'), t('chatbot.hints.redemptionRate')],
    '/automation': [t('chatbot.hints.whichAutomation'), t('chatbot.hints.suggestRules')],
    '/campaigns': [t('chatbot.hints.whenCampaign'), t('chatbot.hints.goodMessage')],
    '/billing': [t('chatbot.hints.planIncludes'), t('chatbot.hints.changePlan')],
    '/settings': [t('chatbot.hints.changePassword'), t('chatbot.hints.branding')],
  };
  if (hints[p]) return hints[p];
  const prefix = '/' + p.split('/').filter(Boolean)[0];
  return hints[prefix] || [];
}

/** Mask PII patterns (emails, phone numbers, IDs, credit cards) from text — SEC-015 fix */
function maskPII(text: string): string {
  return text
    // Mask email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
    // Mask phone numbers (international and local formats, 7+ digits)
    .replace(/\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{3,9}/g, '[tel]')
    // Mask credit card numbers (13-19 digits, with optional separators)
    .replace(/\b(?:\d{4}[-\s]?){3,4}\d{1,7}\b/g, '[card]')
    // Mask national ID / RUC patterns (Ecuador: 10 or 13 digits)
    .replace(/\b\d{10}(?:\d{3})?\b/g, (match) => {
      // Only mask if it looks like an ID (not a timestamp or large number)
      if (match.length === 10 || match.length === 13) return '[id]';
      return match;
    })
    // Keep dollar amounts as-is (aggregate data is useful for AI context)
    .replace(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, (match) => match);
}

/** Capture visible text from main content area at ask-time — sanitized for PII */
function captureScreenContext(t: (key: string, vars?: Record<string, string | number>) => string): string {
  const main = document.querySelector('main');
  if (!main) return '';
  const raw = main.innerText || '';
  const cleaned = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0).join('\n');
  const sanitized = maskPII(cleaned);
  return sanitized.length > 3000 ? sanitized.slice(0, 3000) + '\n' + t('chatbot.truncated') : sanitized;
}

/** Render markdown-like content: **bold**, `code`, line breaks, bullet lists */
function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, li) => {
        if (!line.trim()) return <div key={li} className="h-1" />;
        // Bullet points
        const isBullet = /^[\-\*•]\s/.test(line.trim());
        const content = isBullet ? line.trim().replace(/^[\-\*•]\s/, '') : line;
        // Process inline formatting
        const rendered = processInline(content);
        if (isBullet) {
          return (
            <div key={li} className="flex gap-2 items-start">
              <span className="text-brand-400 mt-0.5 text-xs">●</span>
              <span>{rendered}</span>
            </div>
          );
        }
        // Headers (lines starting with #)
        if (/^#{1,3}\s/.test(line.trim())) {
          const text = line.replace(/^#{1,3}\s/, '');
          return <p key={li} className="font-bold text-surface-900 dark:text-white mt-2">{text}</p>;
        }
        return <p key={li}>{rendered}</p>;
      })}
    </div>
  );
}

function processInline(text: string) {
  // Split on **bold**, `code`, and render accordingly
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Check for **bold**
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    let firstMatch: { index: number; length: number; type: 'bold' | 'code'; content: string } | null = null;

    if (boldMatch?.index !== undefined) {
      firstMatch = { index: boldMatch.index, length: boldMatch[0]!.length, type: 'bold', content: boldMatch[1]! };
    }
    if (codeMatch?.index !== undefined) {
      if (!firstMatch || codeMatch.index < firstMatch.index) {
        firstMatch = { index: codeMatch.index, length: codeMatch[0]!.length, type: 'code', content: codeMatch[1]! };
      }
    }

    if (!firstMatch) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    // Text before match
    if (firstMatch.index > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, firstMatch.index)}</span>);
    }

    // The match itself
    if (firstMatch.type === 'bold') {
      parts.push(<strong key={key++} className="font-semibold text-surface-900 dark:text-white">{firstMatch.content}</strong>);
    } else {
      parts.push(
        <code key={key++} className="bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded text-[11px] font-mono">
          {firstMatch.content}
        </code>
      );
    }

    remaining = remaining.slice(firstMatch.index + firstMatch.length);
  }

  return <>{parts}</>;
}

/** Memoized chat message component (PERF-010) */
const ChatMessage = React.memo(function ChatMessage({ msg, t }: { msg: Message; t: (key: string, vars?: Record<string, string | number>) => string }) {
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {msg.role === 'assistant' && (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold mr-2 mt-1 flex-shrink-0 shadow-sm">
          {t('chatbot.aiLabel')}
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
          msg.role === 'user'
            ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-tr-md shadow-md'
            : 'bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 border border-surface-150 dark:border-white/[0.06] rounded-tl-md shadow-sm'
        }`}
      >
        {msg.role === 'assistant' ? <RichText text={msg.content} /> : msg.content}
      </div>
    </div>
  );
});

/**
 * @description Floating AI chatbot assistant with screen context capture and markdown rendering.
 * @returns JSX.Element
 */
export default function Chatbot() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useI18n();
  const pageLabel = getLabel(pathname, t);
  const hints = getHints(pathname, t);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial',
      role: 'assistant',
      content: t('chatbot.welcomeMessage'),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextId, setContextId] = useState<string | null>(null);
  const [isCapturingContext, setIsCapturingContext] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const msgIdRef = useRef(0);
  const nextId = () => `msg-${++msgIdRef.current}`;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Auto-focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      setIsCapturingContext(true);
      const screenText = captureScreenContext(t);
      setIsCapturingContext(false);
      const contextEnrichedMessage = [
        t('chatbot.context.header'),
        t('chatbot.context.page', { pageLabel, pathname }),
        t('chatbot.context.user', {
          fullName: user?.full_name || t('common.unknown'),
          role: user?.role || t('common.unknown'),
          tenantName: user?.tenant_name || t('common.unknown'),
        }),
        '',
        t('chatbot.context.visibleData'),
        screenText,
        t('chatbot.context.endData'),
        '',
        t('chatbot.context.userQuestion', { userMessage }),
      ].join('\n');

      abortRef.current = new AbortController();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: contextEnrichedMessage, context_id: contextId }),
        signal: abortRef.current.signal,
      });

      const data = await response.json();
      if (response.ok) {
        if (data.context_id) setContextId(data.context_id);
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'assistant', content: data.response },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'assistant', content: t('chatbot.errorProcessing') },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', content: t('chatbot.errorConnection') },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 text-white rounded-full 
        shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-300 z-40 
        hover:scale-110 active:scale-95
        ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        aria-label={t('chatbot.openAssistant')}
        id="chatbot-toggle"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
      </button>

      {/* Chat Window — 2.5x bigger */}
      <div
        role="dialog"
        aria-label={t('chatbot.chatAssistant')}
        aria-modal="false"
        className={`fixed bottom-4 right-4 w-[560px] h-[780px] bg-white dark:bg-surface-900 rounded-3xl shadow-2xl flex flex-col z-50 transition-all duration-300 origin-bottom-right border border-surface-200 dark:border-surface-700/80 dark:border-white/[0.06]
        ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
        style={{ maxHeight: 'calc(100vh - 32px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 bg-gradient-to-r from-brand-600 to-purple-600 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-sm shadow-inner">
              {t('chatbot.aiLabel')}
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">{t('chatbot.title')}</h3>
              <p className="text-[11px] text-white/70 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block shadow-sm" />
                {pageLabel}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            id="chatbot-close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 px-5 py-4 overflow-y-auto bg-gradient-to-b from-surface-50 to-white dark:from-surface-950 dark:to-surface-900 space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} msg={msg} t={t} />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold mr-2 mt-1 flex-shrink-0">
                {t('chatbot.aiLabel')}
              </div>
              <div className="bg-white dark:bg-surface-900 text-surface-500 border border-surface-150 rounded-2xl rounded-tl-md px-5 py-4 shadow-sm flex gap-2 items-center">
                <span className="w-2.5 h-2.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2.5 h-2.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2.5 h-2.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-xs text-surface-400 ml-2">{t('chatbot.thinking')}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick hints */}
        {hints.length > 0 && messages.length <= 2 && (
          <div className="px-5 py-3 bg-white dark:bg-surface-900 border-t border-surface-100 dark:border-white/[0.06] flex gap-2 flex-wrap">
            {hints.map((hint) => (
              <button
                key={hint}
                onClick={() => setInput(hint)}
                className="text-xs px-3 py-1.5 bg-brand-50 text-brand-700 rounded-full hover:bg-brand-100 transition-colors border border-brand-100"
              >
                {hint}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 bg-white dark:bg-surface-900 border-t border-surface-100 dark:border-white/[0.06] rounded-b-3xl">
          {/* SEC-015: Visible indicator that screen context is being captured */}
          {isCapturingContext && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              {t('chatbot.capturingContext')}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chatbot.inputPlaceholder')}
              disabled={isLoading}
              ref={chatInputRef}
              className="flex-1 bg-surface-50 border border-surface-200 dark:border-surface-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all focus:bg-white dark:bg-surface-900"
              id="chatbot-input"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-br from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 text-white px-4 py-3 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg active:scale-95"
              id="chatbot-send"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
