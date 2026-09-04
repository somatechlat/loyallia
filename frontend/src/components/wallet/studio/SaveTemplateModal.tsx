/**
 * Save Template Modal
 *
 * Allows users to save the current design as a named template.
 */

'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { LockedFeature } from './LockedFeature';
import { LimitReached } from './LimitReached';

export interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
  defaultName?: string;
}

/* ── Inline icons ────────────────────────────────────────────────── */

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

/* ── Component ───────────────────────────────────────────────────── */

export function SaveTemplateModal({ isOpen, onClose, onSave, defaultName = '' }: SaveTemplateModalProps) {
  const { t } = useI18n();
  const planFeatures = usePlanFeatures();
  const [name, setName] = React.useState(defaultName);
  const [description, setDescription] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setDescription('');
    }
  }, [isOpen, defaultName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && planFeatures.hasCustomTemplates && !planFeatures.isAtTemplateLimit) {
      onSave(name.trim(), description.trim());
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        data-testid="save-template-backdrop"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>💾</span>
            {t('wallet.studio.saveTemplate.title')}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label={t('common.close')}
            data-testid="save-template-close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {!planFeatures.hasCustomTemplates && (
            <LockedFeature
              featureName={t('wallet.studio.saveTemplate.customTemplates')}
              requiredPlan={t('wallet.studio.saveTemplate.professional')}
              isLocked={!planFeatures.hasCustomTemplates}
            >
              <div />
            </LockedFeature>
          )}

          {planFeatures.isAtTemplateLimit && (
            <LimitReached
              resourceName={t('wallet.studio.saveTemplate.customTemplatesLower')}
              used={planFeatures.walletTemplatesUsed}
              limit={planFeatures.walletTemplatesLimit}
            />
          )}

          <div>
            <label htmlFor="template-name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              {t('wallet.studio.saveTemplate.name')}
            </label>
            <input
              id="template-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('wallet.studio.saveTemplate.namePlaceholder')}
              disabled={!planFeatures.hasCustomTemplates || planFeatures.isAtTemplateLimit}
              maxLength={100}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="template-name-input"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="template-description" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              {t('wallet.studio.saveTemplate.description')}
            </label>
            <textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('wallet.studio.saveTemplate.descriptionPlaceholder')}
              rows={3}
              disabled={!planFeatures.hasCustomTemplates || planFeatures.isAtTemplateLimit}
              maxLength={500}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="template-description-input"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              data-testid="template-cancel-btn"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !planFeatures.hasCustomTemplates || planFeatures.isAtTemplateLimit}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              data-testid="template-save-btn"
            >
              <SaveIcon className="w-4 h-4" />
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
