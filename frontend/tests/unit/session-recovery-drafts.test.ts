/**
 * session-recovery-drafts.test.ts — R13: autosave de borradores para los flujos
 * que lo perdían todo al recargar (programs/new, CampaignWizard, AutomationModal).
 *
 * Reutiliza el patrón de useSessionRecovery (localStorage + persistencia
 * periódica y en beforeunload + banner "Recuperar borrador"/"Descartar") con
 * una clave POR FLUJO. El borrador solo se limpia después de un envío exitoso.
 */
import React, { createElement as h, useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act, renderHook } from '@testing-library/react';

import { I18nProvider } from '@/lib/i18n';
import {
  DRAFT_KEYS,
  readDraftState,
  persistDraftState,
  clearDraftState,
  useDraftRecovery,
} from '@/hooks/useSessionRecovery';
import CampaignWizard from '@/components/campaigns/CampaignWizard';
import AutomationModal from '@/components/automation/AutomationModal';
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

const Wrapper = ({ children }: { children: React.ReactNode }) =>
  h(I18nProvider, null, children);

const BANNER_TEXT = 'Se detectó un borrador sin guardar de una sesión anterior.';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

// ─── Capa de persistencia (localStorage por flujo) ────────────────────────────

describe('persistencia de borradores por flujo', () => {
  it('las claves de cada flujo son únicas (los borradores no colisionan)', () => {
    const values = Object.values(DRAFT_KEYS);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toEqual(['campaign-wizard-draft', 'automation-modal-draft', 'program-new-draft']);
  });

  it('persistDraftState guarda { state, timestamp } y readDraftState lo recupera', () => {
    persistDraftState('flow-a', { titulo: 'Promo' });
    const raw = JSON.parse(localStorage.getItem('flow-a')!);
    expect(raw.state).toEqual({ titulo: 'Promo' });
    expect(typeof raw.timestamp).toBe('number');
    expect(readDraftState('flow-a')).toEqual({ titulo: 'Promo' });
  });

  it('readDraftState devuelve null con clave ausente, JSON corrupto o payload inválido', () => {
    expect(readDraftState('no-existe')).toBeNull();
    localStorage.setItem('corrupto', '{no-json');
    expect(readDraftState('corrupto')).toBeNull();
    localStorage.setItem('invalido', JSON.stringify({ foo: 1 }));
    expect(readDraftState('invalido')).toBeNull();
  });

  it('clearDraftState elimina el borrador (idempotente)', () => {
    persistDraftState('flow-a', { x: 1 });
    clearDraftState('flow-a');
    clearDraftState('flow-a');
    expect(localStorage.getItem('flow-a')).toBeNull();
    expect(readDraftState('flow-a')).toBeNull();
  });

  it('useDraftRecovery detecta, recupera y descarta borradores', () => {
    localStorage.setItem('flow-hook', JSON.stringify({ state: { a: 7 }, timestamp: 1 }));
    const { result } = renderHook(() => useDraftRecovery<{ a: number }>('flow-hook'));
    expect(result.current.hasDraft).toBe(true);
    expect(result.current.recoverDraft()).toEqual({ a: 7 });
    act(() => result.current.discardDraft());
    expect(result.current.hasDraft).toBe(false);
    expect(localStorage.getItem('flow-hook')).toBeNull();
    act(() => result.current.persistDraft({ a: 9 }));
    expect(readDraftState('flow-hook')).toEqual({ a: 9 });
  });
});

// ─── CampaignWizard ───────────────────────────────────────────────────────────

const PLAN_FEATURES = ['email_campaigns', 'whatsapp_campaigns', 'wallet_campaigns', 'sms_campaigns'];

const campaignFormData = () => ({
  internalName: '',
  title: 'Promo Verano',
  message: 'Mensaje de prueba',
  imageUrl: '',
  actionUrl: '',
  channel: 'email',
  walletPlatform: 'both',
  audience: {
    mode: 'preset',
    programId: 'all',
    walletPlatform: 'both',
    segmentId: 'all',
    customerIds: [],
    excludedCustomerIds: [],
    customerCount: 3,
    label: 'Todos',
  },
  scheduleType: 'immediate',
  scheduledAt: null,
  whatsappSessionId: null,
  whatsappFanout: false,
});

function renderCampaignWizard(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn();
  const utils = render(
    h(
      Wrapper,
      null,
      h(CampaignWizard, {
        isOpen: true,
        onClose,
        onSubmit,
        programs: [{ id: 'p1', name: 'Programa A', member_count: 3 }],
        segments: [{ id: 's1', name: 'Activos', count: 3 }],
        planFeatures: PLAN_FEATURES,
        planLimits: {},
        planUsage: {},
      })
    )
  );
  return { ...utils, onClose, onSubmit };
}

function seedCampaignDraft(step = 2) {
  persistDraftState(DRAFT_KEYS.campaignWizard, { formData: campaignFormData(), step });
}

/**
 * Footer "🚀 Enviar ahora". El toggle de programación inmediata comparte el
 * texto, así que se desambigua por la clase del botón del pie del wizard.
 */
const sendNowButton = () =>
  screen.getAllByRole('button', { name: /Enviar ahora/ }).find((b) => b.className.includes('btn-primary'))!;

describe('CampaignWizard — borrador (R13)', () => {
  it('muestra el banner y "Recuperar borrador" restaura el estado guardado', async () => {
    seedCampaignDraft();
    renderCampaignWizard();
    expect(screen.getByText(BANNER_TEXT)).toBeTruthy();

    fireEvent.click(screen.getByTestId('draft-recover-btn'));
    await waitFor(() => {
      expect((document.getElementById('campaign-title') as HTMLInputElement).value).toBe('Promo Verano');
    });
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
    // El borrador sigue disponible hasta un envío exitoso.
    expect(readDraftState(DRAFT_KEYS.campaignWizard)).not.toBeNull();
  });

  it('"Descartar" elimina el borrador sin recuperarlo', () => {
    seedCampaignDraft();
    renderCampaignWizard();
    fireEvent.click(screen.getByTestId('draft-discard-btn'));
    expect(localStorage.getItem(DRAFT_KEYS.campaignWizard)).toBeNull();
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
    expect((document.getElementById('campaign-title') as HTMLInputElement | null)?.value ?? '').not.toBe('Promo Verano');
  });

  it('beforeunload persiste el borrador cuando hay cambios sin guardar', () => {
    renderCampaignWizard();
    // Canal por defecto: wallet. Cambiar a email deja el estado sucio.
    const emailButton = screen.getAllByRole('button').find((b) => (b.textContent ?? '').includes('Email'));
    fireEvent.click(emailButton!);
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    const draft = readDraftState<{ formData: { channel: string } }>(DRAFT_KEYS.campaignWizard);
    expect(draft).not.toBeNull();
    expect(draft!.formData.channel).toBe('email');
  });

  it('no persiste nada con estado limpio', () => {
    renderCampaignWizard();
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    expect(localStorage.getItem(DRAFT_KEYS.campaignWizard)).toBeNull();
  });

  it('limpia el borrador solo después de un envío exitoso', async () => {
    seedCampaignDraft();
    const { onSubmit } = renderCampaignWizard();
    fireEvent.click(screen.getByTestId('draft-recover-btn'));
    await waitFor(() => expect(document.getElementById('campaign-title')).toBeTruthy());

    fireEvent.click(sendNowButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(localStorage.getItem(DRAFT_KEYS.campaignWizard)).toBeNull());
  });

  it('un envío fallido conserva el borrador', async () => {
    seedCampaignDraft();
    const onSubmit = vi.fn().mockRejectedValue(new Error('SRI caído'));
    renderCampaignWizard(onSubmit);
    fireEvent.click(screen.getByTestId('draft-recover-btn'));
    await waitFor(() => expect(document.getElementById('campaign-title')).toBeTruthy());

    fireEvent.click(sendNowButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(localStorage.getItem(DRAFT_KEYS.campaignWizard)).not.toBeNull();
  });
});

// ─── AutomationModal ──────────────────────────────────────────────────────────

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

/**
 * Harness con el mismo contrato del padre real (useAutomations.handleSave):
 * `behavior: 'success'` cierra el modal tras guardar; `'failure'` lo deja
 * abierto (validación o error de API).
 */
function AutomationHarness({ behavior }: { behavior: 'success' | 'failure' }) {
  const [form, setForm] = useState<AutomationForm>({ ...AUTO_FORM, action_config: { title: '', message: '' } });
  const [step, setStep] = useState(1);
  const [stepErrors, setStepErrors] = useState({ name: false });
  const [show, setShow] = useState(true);
  return h(AutomationModal, {
    show,
    editingId: null,
    form,
    setForm,
    saving: false,
    step,
    setStep,
    stepErrors,
    setStepErrors,
    programs: [],
    onSave: () => {
      if (behavior === 'success') setShow(false);
      return Promise.resolve();
    },
    onClose: () => setShow(false),
  });
}

function seedAutomationDraft(name = 'Cumpleaños') {
  persistDraftState(DRAFT_KEYS.automationModal, {
    form: { ...AUTO_FORM, name, action_config: { title: '', message: '' } },
    step: 1,
  });
}

/** Footer "Siguiente" (steps 1-2) — el botón de guardar solo existe en el paso 3. */
const nextStepButton = () => document.querySelector('button.btn-primary.text-sm') as HTMLButtonElement;

describe('AutomationModal — borrador (R13)', () => {
  it('muestra el banner y "Recuperar borrador" restaura el formulario', async () => {
    seedAutomationDraft();
    render(h(Wrapper, null, h(AutomationHarness, { behavior: 'success' })));
    expect(screen.getByText(BANNER_TEXT)).toBeTruthy();

    fireEvent.click(screen.getByTestId('draft-recover-btn'));
    await waitFor(() => {
      expect((document.getElementById('auto-name') as HTMLInputElement).value).toBe('Cumpleaños');
    });
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
  });

  it('beforeunload persiste el borrador con cambios sin guardar', () => {
    render(h(Wrapper, null, h(AutomationHarness, { behavior: 'success' })));
    fireEvent.change(document.getElementById('auto-name')!, { target: { value: 'Borrador automático' } });
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    const draft = readDraftState<{ form: { name: string } }>(DRAFT_KEYS.automationModal);
    expect(draft!.form.name).toBe('Borrador automático');
  });

  it('limpia el borrador solo después de un guardado exitoso (el padre cierra el modal)', async () => {
    render(h(Wrapper, null, h(AutomationHarness, { behavior: 'success' })));
    fireEvent.change(document.getElementById('auto-name')!, { target: { value: 'Guardable' } });
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    expect(localStorage.getItem(DRAFT_KEYS.automationModal)).not.toBeNull();

    // Avanzar al paso 3, donde vive el botón de guardar.
    fireEvent.click(nextStepButton());
    fireEvent.click(nextStepButton());
    fireEvent.click(document.getElementById('save-automation-btn')!);
    await waitFor(() => expect(localStorage.getItem(DRAFT_KEYS.automationModal)).toBeNull());
  });

  it('un guardado fallido (el modal sigue abierto) conserva el borrador', async () => {
    render(h(Wrapper, null, h(AutomationHarness, { behavior: 'failure' })));
    fireEvent.change(document.getElementById('auto-name')!, { target: { value: 'No guardable' } });
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    fireEvent.click(nextStepButton());
    fireEvent.click(nextStepButton());
    fireEvent.click(document.getElementById('save-automation-btn')!);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(localStorage.getItem(DRAFT_KEYS.automationModal)).not.toBeNull();
  });
});
