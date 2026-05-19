/* designerV2/sections/LinksSection.tsx — Homepage, help, additional links */

'use client';

import React, { useState } from 'react';
import { Info, Plus, X } from '@/components/ui/LucideIcons';
import type { WalletDesignState, WalletLink } from '../types';

function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" strokeWidth={1.5} />
      <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">{children}</p>
    </div>
  );
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export interface LinksSectionProps {
  walletDesign: WalletDesignState;
  onWalletDesignChange: (state: WalletDesignState) => void;
}

export function LinksSection({ walletDesign, onWalletDesignChange }: LinksSectionProps) {
  const [addingLink, setAddingLink] = useState(false);
  const [linkForm, setLinkForm] = useState({ label: '', uri: '' });

  const addLink = () => {
    if (!linkForm.label.trim() || !linkForm.uri.trim()) return;
    const newLink: WalletLink = {
      id: uid(),
      label: linkForm.label.trim(),
      uri: linkForm.uri.trim(),
    };
    onWalletDesignChange({ ...walletDesign, links: [...walletDesign.links, newLink] });
    setLinkForm({ label: '', uri: '' });
    setAddingLink(false);
  };

  const removeLink = (id: string) => {
    onWalletDesignChange({ ...walletDesign, links: walletDesign.links.filter(l => l.id !== id) });
  };

  const updateUri = (key: 'homepageUri' | 'helpUri', value: string) => {
    onWalletDesignChange({ ...walletDesign, [key]: value });
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Enlaces</h2>

      <InfoCallout>
        Los enlaces aparecen en la vista de detalles del pase.
      </InfoCallout>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Página principal</label>
          <input
            type="url"
            placeholder="https://..."
            className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={walletDesign.homepageUri}
            onChange={e => updateUri('homepageUri', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Página de ayuda</label>
          <input
            type="url"
            placeholder="https://..."
            className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={walletDesign.helpUri}
            onChange={e => updateUri('helpUri', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Enlaces adicionales</h3>

        {walletDesign.links.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">No hay enlaces adicionales</div>
        ) : (
          <div className="space-y-2">
            {walletDesign.links.map(link => (
              <div key={link.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-foreground truncate">{link.label}</p>
                  <p className="text-xs text-muted-foreground truncate font-mono">{link.uri}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeLink(link.id)}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}

        {addingLink ? (
          <div className="space-y-2 p-3 rounded-lg border border-border bg-card">
            <input
              type="text"
              placeholder="Etiqueta"
              className="input h-8 text-sm"
              value={linkForm.label}
              onChange={e => setLinkForm({ ...linkForm, label: e.target.value })}
            />
            <input
              type="url"
              placeholder="https://..."
              className="input h-8 text-sm"
              value={linkForm.uri}
              onChange={e => setLinkForm({ ...linkForm, uri: e.target.value })}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setAddingLink(false)} className="btn-ghost flex-1 text-xs">Cancelar</button>
              <button type="button" onClick={addLink} className="btn-primary flex-1 text-xs">Agregar</button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingLink(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            Agregar enlace
          </button>
        )}
      </div>
    </div>
  );
}
