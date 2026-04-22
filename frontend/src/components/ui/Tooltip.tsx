/**
 * Loyallia — Reusable Tooltip Component
 * REQ: SYS-007, DASH-008
 *
 * Usage:
 *   <Tooltip text="Explanation text here" />
 *   <Tooltip text="Longer explanation text" position="bottom" />
 *
 * Renders a small "?" icon (16px circle). On hover, shows a floating
 * explanation panel with smart positioning and dark mode support.
 */
"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";

interface TooltipProps {
  /** The explanation text to show on hover */
  text: string;
  /** Preferred position (auto-adjusts if near viewport edge) */
  position?: "top" | "bottom" | "left" | "right";
  /** Icon size in pixels */
  size?: number;
}

export default function Tooltip({
  text,
  position = "top",
  size = 16,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    actualPos: string;
  }>({ top: 0, left: 0, actualPos: position });
  const iconRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  const recalculate = useCallback(() => {
    if (!iconRef.current || !tipRef.current) return;

    const iconRect = iconRef.current.getBoundingClientRect();
    const tipRect = tipRef.current.getBoundingClientRect();
    const padding = 8;
    let top = 0;
    let left = 0;
    let actualPos = position;

    // Calculate based on preferred position, then flip if needed
    switch (position) {
      case "top":
        top = iconRect.top - tipRect.height - padding;
        left = iconRect.left + iconRect.width / 2 - tipRect.width / 2;
        if (top < 8) {
          actualPos = "bottom";
          top = iconRect.bottom + padding;
        }
        break;
      case "bottom":
        top = iconRect.bottom + padding;
        left = iconRect.left + iconRect.width / 2 - tipRect.width / 2;
        if (top + tipRect.height > window.innerHeight - 8) {
          actualPos = "top";
          top = iconRect.top - tipRect.height - padding;
        }
        break;
      case "left":
        top = iconRect.top + iconRect.height / 2 - tipRect.height / 2;
        left = iconRect.left - tipRect.width - padding;
        if (left < 8) {
          actualPos = "right";
          left = iconRect.right + padding;
        }
        break;
      case "right":
        top = iconRect.top + iconRect.height / 2 - tipRect.height / 2;
        left = iconRect.right + padding;
        if (left + tipRect.width > window.innerWidth - 8) {
          actualPos = "left";
          left = iconRect.left - tipRect.width - padding;
        }
        break;
    }

    // Clamp horizontal to viewport
    left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
    // Clamp vertical to viewport
    top = Math.max(8, Math.min(top, window.innerHeight - tipRect.height - 8));

    setCoords({ top, left, actualPos });
  }, [position]);

  useEffect(() => {
    if (visible) recalculate();
  }, [visible, recalculate]);

  return (
    <>
      <span
        ref={iconRef}
        role="button"
        tabIndex={0}
        aria-label={t("Ayuda")}
        className="inline-flex items-center justify-center rounded-full border border-surface-300 dark:border-surface-600 text-surface-400 dark:text-surface-500 hover:text-brand-500 hover:border-brand-400 dark:hover:text-brand-400 dark:hover:border-brand-500 cursor-help transition-colors duration-150 flex-shrink-0 select-none"
        style={{ width: size, height: size, fontSize: size * 0.6 }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        ?
      </span>

      {visible && (
        <div
          ref={tipRef}
          role="tooltip"
          className="fixed z-[9999] max-w-xs px-3 py-2 text-xs leading-relaxed rounded-xl shadow-xl border animate-fade-in
            bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200
            border-surface-200 dark:border-surface-700"
          style={{ top: coords.top, left: coords.left }}
        >
          {t(text)}
          {/* Arrow indicator */}
          <div
            className={`absolute w-2 h-2 rotate-45
              bg-white dark:bg-surface-800
              border-surface-200 dark:border-surface-700
              ${coords.actualPos === "top" ? "bottom-[-5px] left-1/2 -translate-x-1/2 border-b border-r" : ""}
              ${coords.actualPos === "bottom" ? "top-[-5px] left-1/2 -translate-x-1/2 border-t border-l" : ""}
              ${coords.actualPos === "left" ? "right-[-5px] top-1/2 -translate-y-1/2 border-t border-r" : ""}
              ${coords.actualPos === "right" ? "left-[-5px] top-1/2 -translate-y-1/2 border-b border-l" : ""}
            `}
          />
        </div>
      )}
    </>
  );
}
