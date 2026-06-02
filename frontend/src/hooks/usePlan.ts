import { PlanProvider, usePlanContext } from '@/context/PlanContext';

export { PlanProvider };

export interface UsePlanReturn {
  planName: string;
  features: string[];
  limits: Record<string, number>;
  usage: Record<string, number>;
  hasFeature: (feature: string) => boolean;
  getLimit: (resource: string) => number;
  getUsage: (resource: string) => number;
  isAtLimit: (resource: string) => boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePlan(): UsePlanReturn {
  const ctx = usePlanContext();

  const hasFeature = (feature: string): boolean => ctx.features.includes(feature);

  const getLimit = (resource: string): number => ctx.limits[resource] ?? 0;

  const getUsage = (resource: string): number => ctx.usage[resource] ?? 0;

  const isAtLimit = (resource: string): boolean => {
    const limit = ctx.limits[resource] ?? 0;
    if (limit <= 0) return false;
    return (ctx.usage[resource] ?? 0) >= limit;
  };

  return {
    planName: ctx.planName,
    features: ctx.features,
    limits: ctx.limits,
    usage: ctx.usage,
    hasFeature,
    getLimit,
    getUsage,
    isAtLimit,
    isLoading: ctx.isLoading,
    error: ctx.error,
    refetch: ctx.refetch,
  };
}
