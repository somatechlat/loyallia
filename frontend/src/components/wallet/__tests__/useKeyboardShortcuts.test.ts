/**
 * Unit tests for useKeyboardShortcuts hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

function dispatchKey(key: string, options?: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; target?: EventTarget }) {
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: options?.ctrlKey ?? false,
    metaKey: options?.metaKey ?? false,
    shiftKey: options?.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
  });
  if (options?.target) {
    Object.defineProperty(event, 'target', { value: options.target });
  }
  window.dispatchEvent(event);
}

describe('useKeyboardShortcuts', () => {
  const mocks = {
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onSave: vi.fn(),
    onExport: vi.fn(),
    onAIOpen: vi.fn(),
    onToggleBack: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onResetZoom: vi.fn(),
    onEscape: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('calls onUndo for Ctrl+Z', () => {
    renderHook(() => useKeyboardShortcuts(mocks));
    dispatchKey('z', { ctrlKey: true });
    expect(mocks.onUndo).toHaveBeenCalledTimes(1);
  });

  it('calls onRedo for Ctrl+Shift+Z', () => {
    renderHook(() => useKeyboardShortcuts(mocks));
    dispatchKey('z', { ctrlKey: true, shiftKey: true });
    expect(mocks.onRedo).toHaveBeenCalledTimes(1);
  });

  it('calls onSave for Ctrl+S', () => {
    renderHook(() => useKeyboardShortcuts(mocks));
    dispatchKey('s', { ctrlKey: true });
    expect(mocks.onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onExport for Ctrl+E', () => {
    renderHook(() => useKeyboardShortcuts(mocks));
    dispatchKey('e', { ctrlKey: true });
    expect(mocks.onExport).toHaveBeenCalledTimes(1);
  });

  it('calls onAIOpen for Ctrl+I', () => {
    renderHook(() => useKeyboardShortcuts(mocks));
    dispatchKey('i', { ctrlKey: true });
    expect(mocks.onAIOpen).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleBack for B', () => {
    renderHook(() => useKeyboardShortcuts(mocks));
    dispatchKey('b');
    expect(mocks.onToggleBack).toHaveBeenCalledTimes(1);
  });

  it('calls onZoomIn for Ctrl++', () => {
    renderHook(() => useKeyboardShortcuts(mocks));
    dispatchKey('+', { ctrlKey: true });
    expect(mocks.onZoomIn).toHaveBeenCalledTimes(1);
  });

  it('calls onZoomOut for Ctrl+-', () => {
    renderHook(() => useKeyboardShortcuts(mocks));
    dispatchKey('-', { ctrlKey: true });
    expect(mocks.onZoomOut).toHaveBeenCalledTimes(1);
  });

  it('calls onResetZoom for Ctrl+0', () => {
    renderHook(() => useKeyboardShortcuts(mocks));
    dispatchKey('0', { ctrlKey: true });
    expect(mocks.onResetZoom).toHaveBeenCalledTimes(1);
  });

  it('calls onEscape for Escape', () => {
    renderHook(() => useKeyboardShortcuts(mocks));
    dispatchKey('Escape');
    expect(mocks.onEscape).toHaveBeenCalledTimes(1);
  });

  it('ignores shortcuts when typing in an input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    renderHook(() => useKeyboardShortcuts(mocks));
    dispatchKey('b', { target: input });
    expect(mocks.onToggleBack).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('ignores B shortcut when modifier key is pressed', () => {
    renderHook(() => useKeyboardShortcuts(mocks));
    dispatchKey('b', { ctrlKey: true });
    expect(mocks.onToggleBack).not.toHaveBeenCalled();
  });
});
