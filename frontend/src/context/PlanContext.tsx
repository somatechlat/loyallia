'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export interface PlanData {
  planName: string;
  features: string[];
  limits: Record<string, number>;
  usage: Record<string, number>;
}

export interface PlanContextValue extends PlanData {
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

const EMPTY_PLAN: PlanData = {
  planName: '',
  features: [],
  limits: {},
  usage: {},
};

/** Props for the {@link PlanProvider} component. */
export interface PlanProviderProps {
  /** React tree to wrap. */
  children: React.ReactNode;
}

export function PlanProvider({ children }: PlanProviderProps) {
  const [data, setData] = useState<PlanData>(EMPTY_PLAN);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlan = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: res } = await api.get('/api/v1/tenants/me/plan-features/');
      setData({
        planName: res.plan_name ?? res.plan ?? '',
        features: Array.isArray(res.features) ? res.features : [],
        limits: typeof res.limits === 'object' && res.limits !== null ? res.limits : {},
        usage: typeof res.usage === 'object' && res.usage !== null ? res.usage : {},
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al cargar plan'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  return (
    <PlanContext.Provider
      value={{
        ...data,
        isLoading,
        error,
        refetch: fetchPlan,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlanContext(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    throw new Error('usePlanContext must be used within a PlanProvider');
  }
  return ctx;
}
