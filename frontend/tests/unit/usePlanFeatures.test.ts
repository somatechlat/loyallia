/**
 * Unit tests for usePlanFeatures hook.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { PlanProvider } from '@/hooks/usePlan';
import React from 'react';

// Mock the plan API call so PlanProvider does not hit the network
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(() =>
      Promise.resolve({
        data: {
          plan_name: 'Trial',
          features: [
            'wallet_pass_studio',
            'wallet_custom_templates',
            'wallet_advanced_fields',
            'ai_assistant',
          ],
          limits: {
            wallet_templates: 50,
            wallet_pass_updates_month: 200,
            wallet_ai_designs_month: 20,
          },
          usage: {
            wallet_templates: 3,
            wallet_pass_updates_month: 12,
            wallet_ai_designs_month: 2,
          },
        },
      }),
    ),
  },
}));

describe('usePlanFeatures', () => {
  it('returns default features when no PlanProvider is available', () => {
    const { result } = renderHook(() => usePlanFeatures());

    expect(result.current.hasPassStudio).toBe(true);
    expect(result.current.hasCustomTemplates).toBe(true);
    expect(result.current.hasAdvancedFields).toBe(true);
    expect(result.current.hasAIAssistant).toBe(true);
    expect(result.current.walletTemplatesLimit).toBe(999);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns plan features from a real PlanProvider', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(PlanProvider, null, children);

    const { result } = renderHook(() => usePlanFeatures(), { wrapper });

    // Wait for the async plan fetch inside PlanProvider
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasPassStudio).toBe(true);
    expect(result.current.hasCustomTemplates).toBe(true);
    expect(result.current.hasAdvancedFields).toBe(true);
    expect(result.current.hasAIAssistant).toBe(true);
  });

  it('returns limits from a real PlanProvider', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(PlanProvider, null, children);

    const { result } = renderHook(() => usePlanFeatures(), { wrapper });

    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.walletTemplatesLimit).toBe(50);
    expect(result.current.walletPassUpdatesLimit).toBe(200);
  });

  it('returns usage from a real PlanProvider', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(PlanProvider, null, children);

    const { result } = renderHook(() => usePlanFeatures(), { wrapper });

    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.walletTemplatesUsed).toBe(3);
    expect(result.current.walletPassUpdatesUsed).toBe(12);
  });
});
