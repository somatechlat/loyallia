'use client';

import { useParams } from 'next/navigation';
import { WalletStudio } from '@/components/wallet/studio/WalletStudio';
import { useState, useEffect } from 'react';
import { programsApi, walletTemplatesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';
import { createDefaultState } from '@/hooks/useWalletStudio';
import { parseWalletDesignFromMetadata } from '@/components/wallet/serialization';

export default function ProgramDesignPage() {
  const params = useParams();
  const programId = params.id as string;

  const [program, setProgram] = useState<{
    id: string;
    name: string;
    card_type: string;
    metadata: Record<string, unknown>;
  } | null>(null);

  const [walletDesign, setWalletDesign] = useState<WalletPassStudioState>(createDefaultState());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    programsApi.get(programId).then((res: { data: { id: string; name: string; card_type: string; metadata: Record<string, unknown> } }) => {
      const p = res.data;
      setProgram(p);
      const design = parseWalletDesignFromMetadata(p.metadata);
      setWalletDesign(prev => ({ ...prev, ...design, name: p.name, cardType: (p.card_type as any) || prev.cardType }));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [programId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex items-center justify-center h-screen text-surface-500">
        Program not found
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900">
        <h1 className="text-lg font-bold text-surface-900 dark:text-white">
          {program.name} — Design Studio
        </h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <WalletStudio
          initialState={walletDesign}
          programId={programId}
          onSave={(state) => setWalletDesign(state)}
          onSaveAsTemplate={async (s) => {
            try {
              await walletTemplatesApi.create({
                name: s.name || 'Plantilla sin nombre',
                description: '',
                card_type: s.cardType,
                industry: s.industry,
                design_state: s as unknown as Record<string, unknown>,
                include_back_content: true,
                tags: [],
              });
              toast.success('Plantilla guardada correctamente');
            } catch (err: any) {
              const msg = err?.response?.data?.detail || err?.message || 'Error al guardar plantilla';
              toast.error(msg);
            }
          }}
        />
      </div>
    </div>
  );
}
