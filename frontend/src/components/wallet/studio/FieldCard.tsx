/**
 * Compact draggable card for a single field.
 */

'use client';

import React, { useState } from 'react';
import type { UnifiedField } from '@/components/wallet/types/unified-state';

export interface FieldCardProps {
  field: UnifiedField;
  onClick: () => void;
  onToggleApple: () => void;
  onToggleGoogle: () => void;
  onDelete: () => void;
  hasNotification: boolean;
}

export function FieldCard({
  field,
  onClick,
  onToggleApple,
  onToggleGoogle,
  onDelete,
  hasNotification,
}: FieldCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const truncatedValue =
    field.value.length > 40 ? field.value.slice(0, 40) + '…' : field.value;

  return (
    <div
      className="group relative flex items-center gap-2 px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-sm transition-all cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Field ${field.label}: ${truncatedValue}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', field.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      {/* Drag handle */}
      <div
        className="flex-shrink-0 text-neutral-300 dark:text-neutral-600 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
        role="button"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="5" r="1" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="5" r="1" />
          <circle cx="15" cy="19" r="1" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
            {field.label}
          </span>
          {field.isDynamic && (
            <code className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1 rounded">
              dynamic
            </code>
          )}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
          {truncatedValue || <span className="italic">No value</span>}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Apple toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleApple();
          }}
          className={`p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            field.showOnApple
              ? 'text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700'
              : 'text-neutral-300 dark:text-neutral-600 hover:text-neutral-400'
          }`}
          title={field.showOnApple ? 'Visible on Apple' : 'Hidden on Apple'}
          aria-label={field.showOnApple ? 'Visible on Apple Wallet' : 'Hidden on Apple Wallet'}
          aria-pressed={field.showOnApple}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
            <path d="M10 2c1 .5 2 2 2 5" />
          </svg>
        </button>

        {/* Google toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleGoogle();
          }}
          className={`p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            field.showOnGoogle
              ? 'text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700'
              : 'text-neutral-300 dark:text-neutral-600 hover:text-neutral-400'
          }`}
          title={field.showOnGoogle ? 'Visible on Google' : 'Hidden on Google'}
          aria-label={field.showOnGoogle ? 'Visible on Google Wallet' : 'Hidden on Google Wallet'}
          aria-pressed={field.showOnGoogle}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="12" x="3" y="6" rx="2" ry="2" />
            <path d="M6 10h.01" />
            <path d="M6 14h.01" />
            <path d="M9 10h6" />
            <path d="M9 14h6" />
            <path d="M18 10h.01" />
            <path d="M18 14h.01" />
          </svg>
        </button>

        {/* Notification bell */}
        <div
          className={`p-1 ${hasNotification ? 'text-blue-500' : 'text-neutral-300 dark:text-neutral-600'}`}
          aria-label={hasNotification ? 'Notifications configured' : 'No notifications'}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill={hasNotification ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={`p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-500 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Delete field"
          title="Delete field"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" x2="10" y1="11" y2="17" />
            <line x1="14" x2="14" y1="11" y2="17" />
          </svg>
        </button>
      </div>
    </div>
  );
}
