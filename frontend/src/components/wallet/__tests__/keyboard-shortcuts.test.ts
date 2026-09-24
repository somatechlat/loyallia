/**
 * Keyboard shortcuts must not eat the browser (U3).
 *
 * Locks: Tab is never stolen, bare `B` is unbound, Delete/Backspace and
 * arrow keys only act when a canvas field is selected, and typing in any
 * form control (input, textarea, select, button, contenteditable) is safe.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useKeyboardShortcuts,
  type KeyboardShortcutsConfig,
} from '@/hooks/useKeyboardShortcuts';

function press(
  key: string,
  init: Partial<KeyboardEventInit> & { target?: EventTarget } = {}
): KeyboardEvent {
  const { target, ...rest } = init;
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...rest,
  });
  (target ?? window).dispatchEvent(event);
  return event;
}

function mount(config: KeyboardShortcutsConfig) {
  return renderHook(() => useKeyboardShortcuts(config));
}

function inputOf(tag: 'input' | 'textarea' | 'select' | 'button'): HTMLElement {
  const el = document.createElement(tag);
  document.body.appendChild(el);
  return el;
}

describe('useKeyboardShortcuts — do not eat the browser', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('never steals Tab — the browser owns focus order', () => {
    const onNextField = vi.fn();
    const onPrevField = vi.fn();
    // even if a caller still passes the old callbacks, Tab must pass through
    const config = { onNextField, onPrevField } as KeyboardShortcutsConfig & {
      onNextField: () => void;
      onPrevField: () => void;
    };
    mount(config);

    const tab = press('Tab');
    expect(tab.defaultPrevented).toBe(false);
    const shiftTab = press('Tab', { shiftKey: true });
    expect(shiftTab.defaultPrevented).toBe(false);
    expect(onNextField).not.toHaveBeenCalled();
    expect(onPrevField).not.toHaveBeenCalled();
  });

  it('unbinds bare B — typing b must not flip the card', () => {
    // no onToggleBack binding exists any more; the toolbar owns that toggle
    mount({});

    const event = press('b');
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores Delete/Backspace when no field is selected', () => {
    const onDelete = vi.fn();
    mount({ onDelete, hasSelection: false });

    const del = press('Delete');
    const back = press('Backspace');
    expect(del.defaultPrevented).toBe(false);
    expect(back.defaultPrevented).toBe(false);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('deletes only when a field is selected and focus is not in a form control', () => {
    const onDelete = vi.fn();
    mount({ onDelete, hasSelection: true });

    for (const tag of ['input', 'textarea', 'select', 'button'] as const) {
      const el = inputOf(tag);
      const event = press('Delete', { target: el });
      expect(event.defaultPrevented).toBe(false);
      expect(onDelete).not.toHaveBeenCalled();
      el.remove();
    }

    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    document.body.appendChild(editable);
    expect(press('Delete', { target: editable }).defaultPrevented).toBe(false);
    expect(onDelete).not.toHaveBeenCalled();

    // on the canvas itself the delete goes through
    const event = press('Delete');
    expect(event.defaultPrevented).toBe(true);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('never steals arrow keys while nothing is selected — page scroll stays native', () => {
    const onNudge = vi.fn();
    mount({ onNudge, hasSelection: false });

    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      const event = press(key);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(onNudge).not.toHaveBeenCalled();
  });

  it('nudges with arrows only when a field is selected', () => {
    const onNudge = vi.fn();
    mount({ onNudge, hasSelection: true });

    press('ArrowUp');
    press('ArrowDown', { shiftKey: true });
    expect(onNudge).toHaveBeenNthCalledWith(1, 'up', 1);
    expect(onNudge).toHaveBeenNthCalledWith(2, 'down', 10);
  });

  it('never fires shortcuts while typing in a select or button', () => {
    const onSave = vi.fn();
    const onUndo = vi.fn();
    mount({ onSave, onUndo, hasSelection: true });

    const select = inputOf('select');
    const button = inputOf('button');
    press('s', { ctrlKey: true, target: select });
    press('z', { ctrlKey: true, target: button });
    expect(onSave).not.toHaveBeenCalled();
    expect(onUndo).not.toHaveBeenCalled();
  });

  it('still lets Escape through from inside a form control', () => {
    const onEscape = vi.fn();
    mount({ onEscape });
    const input = inputOf('input');
    press('Escape', { target: input });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('keeps the modifier shortcuts working', () => {
    const config = {
      onSave: vi.fn(),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onExport: vi.fn(),
      onAIOpen: vi.fn(),
      onToggleGrid: vi.fn(),
      onZoomIn: vi.fn(),
      onZoomOut: vi.fn(),
      onResetZoom: vi.fn(),
      onEscape: vi.fn(),
    };
    mount(config);

    press('s', { ctrlKey: true });
    press('z', { ctrlKey: true });
    press('z', { ctrlKey: true, shiftKey: true });
    press('e', { metaKey: true });
    press('i', { ctrlKey: true });
    press('g', { ctrlKey: true });
    press('+', { ctrlKey: true });
    press('-', { ctrlKey: true });
    press('0', { ctrlKey: true });
    press('Escape');

    expect(config.onSave).toHaveBeenCalledTimes(1);
    expect(config.onUndo).toHaveBeenCalledTimes(1);
    expect(config.onRedo).toHaveBeenCalledTimes(1);
    expect(config.onExport).toHaveBeenCalledTimes(1);
    expect(config.onAIOpen).toHaveBeenCalledTimes(1);
    expect(config.onToggleGrid).toHaveBeenCalledTimes(1);
    expect(config.onZoomIn).toHaveBeenCalledTimes(1);
    expect(config.onZoomOut).toHaveBeenCalledTimes(1);
    expect(config.onResetZoom).toHaveBeenCalledTimes(1);
    expect(config.onEscape).toHaveBeenCalledTimes(1);
  });

  it('deletes with Backspace too, but only with a selection', () => {
    const onDelete = vi.fn();
    const withSelection = mount({ onDelete, hasSelection: true });
    press('Backspace');
    expect(onDelete).toHaveBeenCalledTimes(1);

    withSelection.unmount();
    const withoutSelection = vi.fn();
    mount({ onDelete: withoutSelection, hasSelection: false });
    press('Backspace');
    expect(withoutSelection).not.toHaveBeenCalled();
  });
});
