/**
 * R5 — multi-step wizard backdrop/close must never silently discard progress.
 *
 * Regression coverage: clicking the backdrop (or Escape / ✕ / Cancel) with a
 * clean wizard closes it directly; with unsaved changes the existing
 * ui/ConfirmModal asks to discard (Spanish) and the wizard closes ONLY on
 * confirm. Escape stays LIFO: while the discard dialog is open, Escape closes
 * the dialog first and never the wizard behind it.
 */
import React, { useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';

import { I18nProvider } from '@/lib/i18n';
import CampaignWizard from '@/components/campaigns/CampaignWizard';
import AutomationModal from '@/components/automation/AutomationModal';
import TenantWizard from '@/components/superadmin/tenants/TenantWizard';
import type { AutomationForm } from '@/hooks/useAutomations';

vi.mock('@/lib/api', () => {
  const api = Object.assign(vi.fn(() => Promise.resolve({ data: {} })), {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  });
  return {
    default: api,
    programsApi: { list: vi.fn(() => Promise.resolve({ data: [] })) },
    automationApi: {
      list: vi.fn(() => Promise.resolve({ data: [] })),
      stats: vi.fn(() => Promise.resolve({ data: {} })),
      create: vi.fn(() => Promise.resolve({ data: {} })),
      update: vi.fn(() => Promise.resolve({ data: {} })),
    },
    authApi: {},
  };
});
vi.mock('next/dynamic', () => ({ default: () => () => null }));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

/** Click the modal backdrop (the root overlay element). */
function clickBackdrop(container: HTMLElement) {
  fireEvent.click(container.firstElementChild as Element);
}

/** The discard confirmation dialog (both wizards render their own role=dialog). */
function discardDialog(): HTMLElement {
  const title = screen.getByText('¿Descartar cambios?');
  return title.closest('[role="dialog"]') as HTMLElement;
}

function expectNoDiscardDialog() {
  expect(screen.queryByText('¿Descartar cambios?')).toBeNull();
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

const PLAN_FEATURES = ['email_campaigns', 'whatsapp_campaigns', 'wallet_campaigns', 'sms_campaigns'];

function renderCampaignWizard(onClose = vi.fn(), onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const { container } = render(
    <Wrapper>
      <CampaignWizard
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
        programs={[{ id: 'p1', name: 'Programa A', member_count: 3 }]}
        segments={[{ id: 's1', name: 'Activos', count: 3 }]}
        planFeatures={PLAN_FEATURES}
        planLimits={{}}
        planUsage={{}}
      />
    </Wrapper>
  );
  return { onClose, onSubmit, container };
}

/** Change wizard content (channel: wallet → email) so the state is dirty. */
function makeCampaignWizardDirty() {
  // The channel button's text also contains its plan-limits line
  // ("Email0 / 0 por mes"), so match by inclusion, not full equality.
  const emailButton = screen
    .getAllByRole('button')
    .find((b) => (b.textContent ?? '').includes('Email'));
  expect(emailButton, 'channel button "Email" must exist').toBeTruthy();
  fireEvent.click(emailButton!);
}

const AUTO_FORM: AutomationForm = {
  name: '',
  description: '',
  trigger: 'customer_enrolled',
  action: 'send_notification',
  trigger_config: {},
  action_config: { title: '', message: '' },
  cooldown_hours: 24,
  max_executions_per_day: null,
};

function AutomationHarness({ onClose, onSave }: { onClose: () => void; onSave?: () => void }) {
  const [form, setForm] = useState<AutomationForm>({ ...AUTO_FORM, action_config: { title: '', message: '' } });
  const [step, setStep] = useState(1);
  const [stepErrors, setStepErrors] = useState({ name: false });
  return (
    <AutomationModal
      show
      editingId={null}
      form={form}
      setForm={setForm}
      saving={false}
      step={step}
      setStep={setStep}
      stepErrors={stepErrors}
      setStepErrors={setStepErrors}
      programs={[]}
      onSave={onSave ?? (() => {})}
      onClose={onClose}
    />
  );
}

const TENANT_PLANS = [
  { slug: 'professional', name: 'Profesional', price_monthly: 29, trial_days: 14, is_active: true },
];

describe('CampaignWizard — discard confirmation (R5)', () => {
  it('closes directly on a clean state', () => {
    const { onClose, container } = renderCampaignWizard();
    clickBackdrop(container);
    expect(onClose).toHaveBeenCalledTimes(1);
    expectNoDiscardDialog();
  });

  it('asks to discard when there are unsaved changes and closes only on confirm', () => {
    const { onClose, container } = renderCampaignWizard();
    makeCampaignWizardDirty();

    clickBackdrop(container);
    expect(onClose).not.toHaveBeenCalled();
    const dialog = discardDialog();
    expect(dialog.textContent).toContain('Hay cambios sin guardar');

    // Cancel keeps the wizard open
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(onClose).not.toHaveBeenCalled();
    expectNoDiscardDialog();

    // Confirm discards and closes
    clickBackdrop(container);
    fireEvent.click(within(discardDialog()).getByRole('button', { name: 'Descartar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expectNoDiscardDialog();
  });

  it('keeps Escape LIFO: first Escape asks, second Escape cancels the dialog only', () => {
    const { onClose } = renderCampaignWizard();
    makeCampaignWizardDirty();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(discardDialog()).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expectNoDiscardDialog();
    expect(screen.getByRole('dialog')).toBeTruthy(); // wizard still open
  });
});

describe('AutomationModal — discard confirmation (R5)', () => {
  it('closes directly on a clean state', () => {
    const onClose = vi.fn();
    const { container } = render(<Wrapper><AutomationHarness onClose={onClose} /></Wrapper>);
    clickBackdrop(container);
    expect(onClose).toHaveBeenCalledTimes(1);
    expectNoDiscardDialog();
  });

  it('asks to discard when the form was edited and closes only on confirm', () => {
    const onClose = vi.fn();
    const { container } = render(<Wrapper><AutomationHarness onClose={onClose} /></Wrapper>);
    fireEvent.change(document.getElementById('auto-name')!, { target: { value: 'Cumpleaños' } });

    clickBackdrop(container);
    expect(onClose).not.toHaveBeenCalled();
    const dialog = discardDialog();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(onClose).not.toHaveBeenCalled();
    expectNoDiscardDialog();

    clickBackdrop(container);
    fireEvent.click(within(discardDialog()).getByRole('button', { name: 'Descartar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('TenantWizard — discard confirmation (R5)', () => {
  it('closes directly on a clean state', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <Wrapper>
        <TenantWizard open onClose={onClose} plans={TENANT_PLANS} onSuccess={() => {}} />
      </Wrapper>
    );
    clickBackdrop(container);
    expect(onClose).toHaveBeenCalledTimes(1);
    expectNoDiscardDialog();
  });

  it('asks to discard after company data was typed and closes only on confirm', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <Wrapper>
        <TenantWizard open onClose={onClose} plans={TENANT_PLANS} onSuccess={() => {}} />
      </Wrapper>
    );
    fireEvent.click(document.getElementById('wiz-next')!); // step 1 → 2
    fireEvent.change(document.getElementById('wiz-name')!, { target: { value: 'Café Andino' } });

    clickBackdrop(container);
    expect(onClose).not.toHaveBeenCalled();
    const dialog = discardDialog();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(onClose).not.toHaveBeenCalled();

    clickBackdrop(container);
    fireEvent.click(within(discardDialog()).getByRole('button', { name: 'Descartar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
