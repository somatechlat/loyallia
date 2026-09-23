'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import { STUDIO_TOOLS, type StudioToolId } from './tools';
import { TOOL_ICONS } from './tool-icons';

interface ActivityBarProps {
  activeTool: StudioToolId | null;
  onSelect: (tool: StudioToolId | null) => void;
}

export function ActivityBar({ activeTool, onSelect }: ActivityBarProps) {
  const { t } = useI18n();

  return (
    <nav
      className="w-12 h-full bg-neutral-50 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col items-center py-2 gap-0.5 shrink-0"
      role="toolbar"
      aria-label={t('wallet.studio.activityBar.label')}
    >
      {STUDIO_TOOLS.map((tool) => {
        const Icon = TOOL_ICONS[tool.id];
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onSelect(isActive ? null : tool.id)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
            title={t(tool.labelKey)}
            aria-pressed={isActive}
          >
            <Icon className="w-5 h-5" />
          </button>
        );
      })}

      <div className="flex-1" />

      {/* Collapse hint — visual only, actual collapse handled by parent */}
      <div className="w-6 h-px bg-neutral-200 dark:bg-neutral-700 my-1" />
    </nav>
  );
}
