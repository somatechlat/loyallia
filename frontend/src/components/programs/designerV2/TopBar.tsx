/* designerV2/TopBar.tsx — Title, status badge, back button */

'use client';

import React from 'react';
import { ArrowLeft } from '@/components/ui/LucideIcons';

export interface TopBarProps {
  programName: string;
  status?: 'draft' | 'published' | 'suspended';
  onBack?: () => void;
}

const STATUS_CONFIG = {
  draft: { label: 'Borrador', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  published: { label: 'Publicado', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  suspended: { label: 'Suspendido', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

export function TopBar({ programName, status = 'draft', onBack }: TopBarProps) {
  const statusConfig = STATUS_CONFIG[status];

  return (
    <header className="h-14 px-4 flex items-center gap-3 bg-card border-b border-border shrink-0">
      {/* Back button */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors duration-100"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-sm">Volver</span>
        </button>
      )}

      {/* Program name */}
      <h1 className="text-sm font-semibold text-foreground truncate max-w-md">
        {programName}
      </h1>

      {/* Status badge */}
      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusConfig.className}`}>
        {statusConfig.label}
      </span>
    </header>
  );
}
