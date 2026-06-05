/**
 * Back-of-pass design tab for Wallet Pass Studio.
 *
 * SRS-003 Section 8.7 — Back fields, quick links, app link, detail images.
 */

'use client';

import React, { useCallback, useState } from 'react';
import type {
  BackContent,
  BackField,
  BackLink,
  LinkType,
  AppleSpecificConfig,
  GoogleSpecificConfig,
  DetailImage,
} from '@/components/wallet/types/unified-state';

export interface BackDesignTabProps {
  backContent: BackContent;
  onUpdateBackContent: (backContent: Partial<BackContent>) => void;
  appleConfig: AppleSpecificConfig;
  googleConfig: GoogleSpecificConfig;
}

/* ── Inline SVG Icons ──────────────────────────────────────────────── */

function PlusIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function DragHandleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  );
}

function TrashIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function LinkIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function AppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function ImageIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function createEmptyBackField(order: number): BackField {
  return {
    id: `back-field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    value: '',
    isLink: false,
    order,
  };
}

function createEmptyBackLink(): BackLink {
  return {
    id: `back-link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'website',
    url: '',
    label: '',
  };
}

function createEmptyDetailImage(): DetailImage {
  return {
    url: '',
    width: 0,
    height: 0,
  };
}

const LINK_TYPE_OPTIONS: { value: LinkType; label: string }[] = [
  { value: 'website', label: 'Web' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'social', label: 'Social' },
  { value: 'map', label: 'Mapa' },
];

const QUICK_LINK_DEFAULTS: { type: LinkType; label: string; defaultUrl: string }[] = [
  { type: 'website', label: 'Sitio Web', defaultUrl: 'https://' },
  { type: 'phone', label: 'Teléfono', defaultUrl: '' },
  { type: 'email', label: 'Email', defaultUrl: '' },
  { type: 'social', label: 'Instagram', defaultUrl: '' },
  { type: 'social', label: 'Facebook', defaultUrl: '' },
];

/* ── Sub-components ───────────────────────────────────────────────── */

function BackFieldRow({
  field,
  onUpdate,
  onDelete,
}: {
  field: BackField;
  onUpdate: (updated: BackField) => void;
  onDelete: () => void;
}) {
  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ ...field, label: e.target.value });
    },
    [field, onUpdate]
  );

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ ...field, value: e.target.value });
    },
    [field, onUpdate]
  );

  const handleToggleLink = useCallback(() => {
    onUpdate({ ...field, isLink: !field.isLink, linkUrl: field.isLink ? undefined : field.linkUrl ?? '' });
  }, [field, onUpdate]);

  const handleLinkUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ ...field, linkUrl: e.target.value });
    },
    [field, onUpdate]
  );

  const handleLinkTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdate({ ...field, linkType: e.target.value as LinkType });
    },
    [field, onUpdate]
  );

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0 text-neutral-300 dark:text-neutral-600 cursor-grab active:cursor-grabbing" aria-label="Drag to reorder">
          <DragHandleIcon className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          Campo {field.order + 1}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {/* Apple badge */}
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
            🍎 Apple
          </span>
          {/* Google badge */}
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
            🤖 Google
          </span>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Delete field"
            title="Delete field"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Etiqueta
          </label>
          <input
            type="text"
            value={field.label}
            onChange={handleLabelChange}
            placeholder="Ej. Términos"
            className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Valor
          </label>
          <input
            type="text"
            value={field.value}
            onChange={handleValueChange}
            placeholder="Ej. Válido por 30 días"
            className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={field.isLink}
            onChange={handleToggleLink}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-neutral-700 dark:text-neutral-300">Es enlace</span>
        </label>
      </div>

      {field.isLink && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              URL
            </label>
            <input
              type="text"
              value={field.linkUrl ?? ''}
              onChange={handleLinkUrlChange}
              placeholder="https://..."
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Tipo
            </label>
            <select
              value={field.linkType ?? 'website'}
              onChange={handleLinkTypeChange}
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LINK_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────── */

export function BackDesignTab({ backContent, onUpdateBackContent, appleConfig: _appleConfig, googleConfig: _googleConfig }: BackDesignTabProps) {
  const [appLinkEnabled, setAppLinkEnabled] = useState(Boolean(backContent.appLink));

  /* ── Back Fields ────────────────────────────────────────────────── */

  const handleAddBackField = useCallback(() => {
    const newField = createEmptyBackField(backContent.fields.length);
    onUpdateBackContent({ fields: [...backContent.fields, newField] });
  }, [backContent.fields, onUpdateBackContent]);

  const handleUpdateBackField = useCallback(
    (updated: BackField) => {
      onUpdateBackContent({ fields: backContent.fields.map((f) => (f.id === updated.id ? updated : f)) });
    },
    [backContent.fields, onUpdateBackContent]
  );

  const handleDeleteBackField = useCallback(
    (fieldId: string) => {
      const remaining = backContent.fields.filter((f) => f.id !== fieldId);
      const reordered = remaining.map((f, idx) => ({ ...f, order: idx }));
      onUpdateBackContent({ fields: reordered });
    },
    [backContent.fields, onUpdateBackContent]
  );

  /* ── Quick Links ────────────────────────────────────────────────── */

  const handleToggleQuickLink = useCallback(
    (label: string, checked: boolean) => {
      if (checked) {
        const existing = backContent.links.find((l) => l.label === label);
        if (existing) return;
        const defaults = QUICK_LINK_DEFAULTS.find((d) => d.label === label);
        const newLink: BackLink = {
          id: `back-link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: defaults?.type ?? 'website',
          url: defaults?.defaultUrl ?? '',
          label,
        };
        onUpdateBackContent({ links: [...backContent.links, newLink] });
      } else {
        onUpdateBackContent({ links: backContent.links.filter((l) => l.label !== label) });
      }
    },
    [backContent.links, onUpdateBackContent]
  );

  const handleUpdateQuickLinkUrl = useCallback(
    (label: string, url: string) => {
      onUpdateBackContent({
        links: backContent.links.map((l) => (l.label === label ? { ...l, url } : l)),
      });
    },
    [backContent.links, onUpdateBackContent]
  );

  const handleAddCustomLink = useCallback(() => {
    const newLink = createEmptyBackLink();
    onUpdateBackContent({ links: [...backContent.links, newLink] });
  }, [backContent.links, onUpdateBackContent]);

  const handleDeleteCustomLink = useCallback(
    (linkId: string) => {
      onUpdateBackContent({ links: backContent.links.filter((l) => l.id !== linkId) });
    },
    [backContent.links, onUpdateBackContent]
  );

  /* ── App Link ───────────────────────────────────────────────────── */

  const handleToggleAppLink = useCallback(
    (enabled: boolean) => {
      setAppLinkEnabled(enabled);
      if (!enabled) {
        onUpdateBackContent({ appLink: undefined });
      } else {
        onUpdateBackContent({ appLink: { iosAppLink: '', androidAppPackage: '', androidAppLink: '' } });
      }
    },
    [onUpdateBackContent]
  );

  const handleUpdateAppLink = useCallback(
    (patch: Partial<NonNullable<BackContent['appLink']>>) => {
      onUpdateBackContent({ appLink: { ...backContent.appLink, ...patch } });
    },
    [backContent.appLink, onUpdateBackContent]
  );

  /* ── Detail Images ──────────────────────────────────────────────── */

  const handleAddDetailImage = useCallback(() => {
    const newImage = createEmptyDetailImage();
    onUpdateBackContent({ detailImages: [...(backContent.detailImages ?? []), newImage] });
  }, [backContent.detailImages, onUpdateBackContent]);

  const handleUpdateDetailImage = useCallback(
    (index: number, patch: Partial<DetailImage>) => {
      const images = [...(backContent.detailImages ?? [])];
      images[index] = { ...images[index]!, ...patch };
      onUpdateBackContent({ detailImages: images });
    },
    [backContent.detailImages, onUpdateBackContent]
  );

  const handleDeleteDetailImage = useCallback(
    (index: number) => {
      const images = [...(backContent.detailImages ?? [])];
      images.splice(index, 1);
      onUpdateBackContent({ detailImages: images });
    },
    [backContent.detailImages, onUpdateBackContent]
  );

  const sortedFields = [...backContent.fields].sort((a, b) => a.order - b.order);

  const quickLinkLabels = QUICK_LINK_DEFAULTS.map((d) => d.label);
  const customLinks = backContent.links.filter((l) => !quickLinkLabels.includes(l.label));

  return (
    <div className="space-y-6">
      {/* ── CAMPOS DEL REVERSO ── */}
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
          <span role="img" aria-label="document">
            📄
          </span>
          CAMPOS DEL REVERSO — Sin límite
        </h3>

        <div className="space-y-2">
          {sortedFields.length === 0 ? (
            <div className="text-center py-6 text-sm text-neutral-400 dark:text-neutral-500">
              No hay campos en el reverso
            </div>
          ) : (
            sortedFields.map((field) => (
              <BackFieldRow
                key={field.id}
                field={field}
                onUpdate={handleUpdateBackField}
                onDelete={() => handleDeleteBackField(field.id)}
              />
            ))
          )}
        </div>

        <button
          type="button"
          onClick={handleAddBackField}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Añadir campo del reverso"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Añadir campo del reverso
        </button>
      </section>

      {/* ── ENLACES RÁPIDOS ── */}
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
          <LinkIcon className="w-4 h-4" />
          ENLACES RÁPIDOS
        </h3>

        <div className="space-y-3">
          {QUICK_LINK_DEFAULTS.map((defaults) => {
            const link = backContent.links.find((l) => l.label === defaults.label);
            const checked = Boolean(link);
            return (
              <div key={defaults.label} className="flex items-start gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer pt-1.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => handleToggleQuickLink(defaults.label, e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <div className="flex-1 space-y-1">
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    {defaults.label}
                  </label>
                  <input
                    type="text"
                    value={link?.url ?? ''}
                    onChange={(e) => handleUpdateQuickLinkUrl(defaults.label, e.target.value)}
                    disabled={!checked}
                    placeholder={defaults.defaultUrl || `URL de ${defaults.label}`}
                    className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {customLinks.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
            <h4 className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Enlaces personalizados</h4>
            {customLinks.map((link) => (
              <div key={link.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => {
                    onUpdateBackContent({
                      links: backContent.links.map((l) => (l.id === link.id ? { ...l, label: e.target.value } : l)),
                    });
                  }}
                  placeholder="Nombre del enlace"
                  className="flex-1 px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={link.url}
                  onChange={(e) => {
                    onUpdateBackContent({
                      links: backContent.links.map((l) => (l.id === link.id ? { ...l, url: e.target.value } : l)),
                    });
                  }}
                  placeholder="https://..."
                  className="flex-1 px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={link.type}
                  onChange={(e) => {
                    onUpdateBackContent({
                      links: backContent.links.map((l) =>
                        l.id === link.id ? { ...l, type: e.target.value as LinkType } : l
                      ),
                    });
                  }}
                  className="px-2 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LINK_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleDeleteCustomLink(link.id)}
                  className="p-1.5 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label="Eliminar enlace"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleAddCustomLink}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Añadir enlace"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Añadir enlace
        </button>
      </section>

      {/* ── ENLACE A LA APP ── */}
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
          <AppIcon className="w-4 h-4" />
          ENLACE A LA APP
        </h3>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={appLinkEnabled}
            onChange={(e) => handleToggleAppLink(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            Añadir botón &quot;Abrir en la app&quot;
          </span>
        </label>

        {appLinkEnabled && (
          <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-700">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                🍎 Apple (appLaunchURL)
              </label>
              <input
                type="text"
                value={backContent.appLink?.iosAppLink ?? ''}
                onChange={(e) => handleUpdateAppLink({ iosAppLink: e.target.value })}
                placeholder="https://apps.apple.com/..."
                className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                🤖 Google (appLinkData)
              </label>
              <input
                type="text"
                value={backContent.appLink?.androidAppPackage ?? ''}
                onChange={(e) => handleUpdateAppLink({ androidAppPackage: e.target.value })}
                placeholder="com.tuempresa.app (Android package)"
                className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={backContent.appLink?.androidAppLink ?? ''}
                onChange={(e) => handleUpdateAppLink({ androidAppLink: e.target.value })}
                placeholder="https://play.google.com/store/apps/... (iOS URL)"
                className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={backContent.appLink?.iosAppId ?? ''}
                onChange={(e) => handleUpdateAppLink({ iosAppId: e.target.value })}
                placeholder="https://tuapp.com/... (Web URL)"
                className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </section>

      {/* ── IMÁGENES EN DETALLES ── */}
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          IMÁGENES EN DETALLES
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300">
            Google Wallet exclusivo
          </span>
        </h3>

        <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
          <span className="text-base leading-none mt-0.5" role="img" aria-label="warning">
            ⚠️
          </span>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Apple Wallet no soporta imágenes en el reverso
          </p>
        </div>

        <div className="space-y-2">
          {(backContent.detailImages ?? []).map((image, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={image.url}
                onChange={(e) => handleUpdateDetailImage(index, { url: e.target.value })}
                placeholder="https://..."
                className="flex-1 px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={image.description ?? ''}
                onChange={(e) => handleUpdateDetailImage(index, { description: e.target.value })}
                placeholder="Descripción"
                className="w-32 px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => handleDeleteDetailImage(index)}
                className="p-1.5 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Eliminar imagen"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddDetailImage}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Añadir imagen a la vista de detalles"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Añadir imagen a la vista de detalles
        </button>
      </section>
    </div>
  );
}
