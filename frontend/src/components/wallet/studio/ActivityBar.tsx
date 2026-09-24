/**
 * Studio tool navigation rail.
 *
 * Sole tool chooser on desktop. Fully controlled by `ui.activeTab`.
 * Also used as the mobile tool switcher (horizontal orientation) so both
 * surfaces share one registry and one selection state.
 */

'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import { STUDIO_TOOLS, type StudioToolId } from './tools';
import { TOOL_ICONS } from './tool-icons';

export interface ActivityBarProps {
  activeTool: StudioToolId;
  onSelect: (tool: StudioToolId) => void;
  /** Desktop rail is vertical; mobile sheet uses a horizontal scroller. */
  orientation?: 'vertical' | 'horizontal';
  'data-testid'?: string;
}

export function ActivityBar({
  activeTool,
  onSelect,
  orientation = 'vertical',
  'data-testid': dataTestId,
}: ActivityBarProps) {
  const { t } = useI18n();
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const isHorizontal = orientation === 'horizontal';

  // WAI-ARIA APG roving tabindex: the tab stop follows the arrowed focus
  // target, not the selected tool. Clicking a tool re-syncs both.
  const selectedIndex = Math.max(0, STUDIO_TOOLS.findIndex((tool) => tool.id === activeTool));
  const [focusIndex, setFocusIndex] = React.useState(selectedIndex);

  // If selection changes from the outside (parent), re-seat the tab stop on it.
  React.useEffect(() => {
    setFocusIndex(selectedIndex);
  }, [selectedIndex]);

  const moveFocus = (index: number) => {
    const next = (index + STUDIO_TOOLS.length) % STUDIO_TOOLS.length;
    setFocusIndex(next);
    itemRefs.current[next]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    if (current < 0) return;

    // Both axes work in either orientation so the control stays usable
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      moveFocus(current + 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      moveFocus(current - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveFocus(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveFocus(STUDIO_TOOLS.length - 1);
    }
  };

  return (
    <nav
      className={
        isHorizontal
          ? 'flex items-center gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-2 py-2 shrink-0'
          : 'w-20 h-full bg-neutral-50 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col items-stretch py-2 gap-0.5 shrink-0'
      }
      role="navigation"
      aria-label={t('wallet.studio.activityBar.label')}
      onKeyDown={handleKeyDown}
      data-testid={dataTestId}
    >
      {STUDIO_TOOLS.map((tool, index) => {
        const Icon = TOOL_ICONS[tool.id];
        const isActive = activeTool === tool.id;
        const label = t(tool.labelKey);
        return (
          <button
            key={tool.id}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            type="button"
            data-testid={`studio-tool-${tool.id}`}
            onClick={() => onSelect(tool.id)}
            onFocus={() => setFocusIndex(index)}
            aria-current={isActive ? 'page' : undefined}
            tabIndex={index === focusIndex ? 0 : -1}
            title={label}
            className={
              isHorizontal
                ? `flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all duration-150 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200'
                  }`
                : `mx-1.5 rounded-lg flex flex-col items-center justify-center gap-1 py-2 px-1 text-[10px] font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200'
                  }`
            }
          >
            <Icon className={isHorizontal ? 'w-4 h-4' : 'w-5 h-5'} />
            <span className={isHorizontal ? '' : 'w-full text-center leading-tight break-words'}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
