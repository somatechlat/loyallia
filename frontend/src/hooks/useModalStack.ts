/**
 * Studio modal stack for Escape ownership.
 *
 * Escape must close exactly ONE open surface, in LIFO order. The order below
 * is the nesting/z-order of studio dialogs (topmost first). Only when the
 * stack is empty does Escape fall through to the designer shell.
 */

export const STUDIO_MODAL_ESCAPE_ORDER = [
  'ide-export-modal',
  'ide-image-editor',
  'design-score',
  'gallery-preview',
  'gallery',
  'ai-chat',
  'save-template',
  'icon-picker',
  'mobile-bottom-sheet',
] as const;

export type StudioModalId = (typeof STUDIO_MODAL_ESCAPE_ORDER)[number];

/** One close-handler stack per modal id (IconPicker has many instances). */
const handlers = new Map<StudioModalId, Array<() => void>>();

function push(id: StudioModalId, close: () => void): () => void {
  let list = handlers.get(id);
  if (!list) {
    list = [];
    handlers.set(id, list);
  }
  list.push(close);
  return () => {
    const current = handlers.get(id);
    if (!current) return;
    const idx = current.lastIndexOf(close);
    if (idx >= 0) current.splice(idx, 1);
    if (current.length === 0) handlers.delete(id);
  };
}

/** True while any studio modal is registered open. */
export function hasOpenStudioModal(): boolean {
  for (const list of handlers.values()) {
    if (list.length > 0) return true;
  }
  return false;
}

/**
 * Close the topmost open studio modal (LIFO).
 * The handler is popped first so a single Escape never closes two surfaces.
 * Returns true when a modal consumed the Escape.
 */
export function closeTopStudioModal(): boolean {
  for (const id of STUDIO_MODAL_ESCAPE_ORDER) {
    const list = handlers.get(id);
    if (list && list.length > 0) {
      const close = list.pop()!;
      if (list.length === 0) handlers.delete(id);
      close();
      return true;
    }
  }
  return false;
}

/**
 * Register an open modal. Returns an unregister function (call on close/unmount).
 */
export function registerStudioModal(id: StudioModalId, close: () => void): () => void {
  return push(id, close);
}

/** Test helper — drop all registrations. */
export function resetStudioModalStack(): void {
  handlers.clear();
}

/** Escape events already consumed by a fallback binder (prevents double-fire). */
const handledEscapes = new WeakSet<KeyboardEvent>();

/**
 * Single owner of the "Escape when no modal is open" fallback.
 *
 * Safe to bind from more than one shell (overlay + studio): each Escape
 * event is handled at most once. Closes the topmost studio modal if any;
 * otherwise runs `onFallback`. Returns an unsubscribe function.
 */
export function bindStudioEscapeFallback(onFallback: () => void): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (e.defaultPrevented || handledEscapes.has(e)) return;
    handledEscapes.add(e);
    e.preventDefault();
    e.stopPropagation();
    if (!closeTopStudioModal()) onFallback();
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
