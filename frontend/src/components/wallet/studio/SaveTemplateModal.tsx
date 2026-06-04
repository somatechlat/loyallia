/**
 * Save Template Modal for the Wallet Pass Studio.
 *
 * Allows users to save their current design as a reusable template.
 * Gated by plan feature flag and template quota.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { LockedFeature } from '@/components/shared/LockedFeature';
import { LimitReached } from '@/components/shared/LimitReached';

export interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function SaveTemplateModal({ isOpen, onClose, onSave }: SaveTemplateModalProps) {
  const plan = usePlanFeatures();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleClose = useCallback(() => {
    setName('');
    setDescription('');
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    if (name.trim()) {
      onSave(name.trim(), description.trim());
      handleClose();
    }
  }, [name, description, onSave, handleClose]);

  if (!isOpen) return null;

  // Plan gating
  if (!plan.wallet_custom_templates) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />
        <div className="relative z-10 w-full max-w-md">
          <LockedFeature
            featureName="Guardar plantillas personalizadas"
            requiredPlan="Profesional o superior"
            onUpgrade={() => {
              /* TODO: open upgrade modal */
            }}
          />
        </div>
      </div>
    );
  }

  if (plan.usage.wallet_templates >= plan.limits.wallet_templates) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />
        <div className="relative z-10 w-full max-w-md">
          <LimitReached
            limitName="plantillas de wallet"
            current={plan.usage.wallet_templates}
            limit={plan.limits.wallet_templates}
            onUpgrade={() => {
              /* TODO: open upgrade modal */
            }}
          />
        </div>
      </div>
    );
  }

  const canSave = name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-template-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2
            id="save-template-title"
            className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
          >
            Guardar como plantilla
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Cerrar"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="template-name"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Nombre de la plantilla:
            </label>
            <input
              id="template-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Plantilla VIP dorada"
              className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 border-neutral-300 dark:border-neutral-700"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="template-description"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Descripción (opcional):
            </label>
            <textarea
              id="template-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe para qué tipo de negocio o campaña sirve esta plantilla..."
              className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 border-neutral-300 dark:border-neutral-700 resize-none"
            />
          </div>

          {/* Usage indicator */}
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Plantillas usadas: {plan.usage.wallet_templates} / {plan.limits.wallet_templates}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Guardar plantilla
          </button>
        </div>
      </div>
    </div>
  );
}
