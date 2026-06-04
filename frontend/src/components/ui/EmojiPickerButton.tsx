'use client';
import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

const COMMON_EMOJIS = [
  '🎉', '🎁', '💰', '🔥', '⭐', '🎂', '🎊', '💎', '🚀', '❤️',
  '👍', '✅', '🎈', '🎀', '🕒', '⚡', '🔔', '📢', '💬', '🎫',
  '🏬', '🏆', '🍕', '☕', '🎵', '🌟', '💯', '🙌', '👏', '✨',
  '🎮', '📱', '🎸', '🌮', '🍔', '🍦', '🍩', '🥂', '🎳', '🎯',
];

/**
 * Props for the EmojiPickerButton component.
 */
interface EmojiPickerButtonProps {
  /** Callback invoked when an emoji is selected */
  onEmojiSelect: (emoji: string) => void;
  /** Additional CSS classes for the button */
  className?: string;
}

/**
 * @description Button that opens a popover with common emojis for quick insertion.
 * @param {EmojiPickerButtonProps} props - Component props
 * @returns JSX.Element
 */
export default function EmojiPickerButton({ onEmojiSelect, className = '' }: EmojiPickerButtonProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open]);

  return (
    <div className="relative inline-block" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-lg ${className}`}
        title={t('common.insertEmoji')}
        aria-label={t('common.insertEmoji')}
        aria-expanded={open}
      >
        😊
      </button>

      {open && (
        <div className="absolute z-50 mt-1 right-0 w-56 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl shadow-xl p-3 animate-fade-in">
          <div className="grid grid-cols-8 gap-1.5">
            {COMMON_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onEmojiSelect(emoji);
                  setOpen(false);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-100 dark:hover:bg-surface-700 text-lg transition-colors"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
