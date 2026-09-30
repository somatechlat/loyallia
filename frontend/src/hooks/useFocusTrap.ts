"use client";

import { useEffect, useRef } from "react";
import {
  registerStudioModal,
  closeTopStudioModal,
  hasOpenStudioModal,
  type StudioModalId,
} from "./useModalStack";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export interface UseFocusTrapOptions {
  isOpen: boolean;
  /**
   * Escape handler for standalone dialogs (no `modalId`). When `modalId` is
   * set, Escape is owned by the studio modal stack — this callback is invoked
   * through the stack instead of a local key listener.
   */
  onEscape?: () => void;
  containerRef: React.RefObject<HTMLElement | null>;
  /**
   * Studio modal id. Joins the Escape LIFO stack so only one surface closes
   * per Escape press (see useModalStack).
   */
  modalId?: StudioModalId;
}

/**
 * Focus trap for dialogs: cycles Tab inside the container and restores the
 * previously focused element on close. With `modalId`, the dialog joins the
 * studio Escape LIFO stack (Escape closes the topmost modal only).
 */
export function useFocusTrap({ isOpen, onEscape, containerRef, modalId }: UseFocusTrapOptions) {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  // Join / leave the Escape LIFO stack while open.
  useEffect(() => {
    if (!isOpen || !modalId) return;
    return registerStudioModal(modalId, () => onEscapeRef.current?.());
  }, [isOpen, modalId]);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const modal = containerRef.current;
    if (!modal) return;

    const items0 = focusableIn(modal);
    if (items0.length > 0) items0[0]?.focus();
    else modal.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Studio modal: close the TOPMOST modal only (LIFO), then stop the
        // event so the shell fallback (designer close) cannot double-fire.
        if (modalId) {
          if (!hasOpenStudioModal()) return;
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          closeTopStudioModal();
          return;
        }
        // Standalone dialog: local owner.
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onEscapeRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusableIn(modal);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (!active || active === first || !modal.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !active || !modal.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === "function" && document.contains(prev)) {
        prev.focus();
      }
    };
  }, [isOpen, containerRef, modalId]);
}
