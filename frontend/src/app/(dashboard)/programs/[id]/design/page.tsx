'use client';

import { useParams } from 'next/navigation';
import { WalletStudioIntegration } from '@/components/programs/WalletStudioIntegration';
import { useState, useEffect } from 'react';
import { programsApi } from '@/lib/api';
import { type WalletDesignState, defaultWalletDesignState } from '@/components/wallet/types';
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

  const [walletDesign, setWalletDesign] = useState<WalletDesignState>(defaultWalletDesignState());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    programsApi.getById(programId).then((res: { data: { id: string; name: string; card_type: string; metadata: Record<string, unknown> } }) => {
      const p = res.data;
      setProgram(p);
      const design = parseWalletDesignFromMetadata(p.metadata);
      setWalletDesign(design);
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
        <WalletStudioIntegration
          cardType={program.card_type}
          state={walletDesign}
          onChange={setWalletDesign}
          provider={walletDesign.provider}
        />
      </div>
    </div>
  );
}
