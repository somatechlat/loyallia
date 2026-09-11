'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import toast from 'react-hot-toast';
import PlatformModeBanner from '@/components/superadmin/settings/PlatformModeBanner';
import SystemOperationsPanel from '@/components/superadmin/settings/SystemOperationsPanel';
import BroadcastPanel from '@/components/superadmin/settings/BroadcastPanel';
import { errorMessage } from '@/components/superadmin/settings/constants';
import api, { superAdminApi } from '@/lib/api';

interface SysAdminOperationsProps {
  mode: 'development' | 'production';
}

export default function SysAdminOperations({
  mode,
}: SysAdminOperationsProps) {
  const { t } = useI18n();
  const [broadcastForm, setBroadcastForm] = useState({ subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const [seedingDemo, setSeedingDemo] = useState(false);
  const [seedOutput, setSeedOutput] = useState('');

  const [resetStep, setResetStep] = useState<'idle' | 'otp_sent' | 'confirming'>('idle');
  const [resetOtp, setResetOtp] = useState('');
  const [requestingReset, setRequestingReset] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const toastId = toast.loading(t('superadmin.settings.sysadmin.broadcastLoading'));
    try {
      const { data } = await api.post('/api/v1/admin/broadcast/', broadcastForm);
      toast.success(data.message || t('superadmin.settings.sysadmin.broadcastSent'), { id: toastId });
      setBroadcastForm({ subject: '', message: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('superadmin.settings.sysadmin.broadcastError');
      toast.error(msg, { id: toastId });
    } finally {
      setSending(false);
    }
  };

  const handleSeedDemo = async () => {
    if (!window.confirm(t('superadmin.settings.sysadmin.seedDemoConfirm'))) return;
    setSeedingDemo(true);
    setSeedOutput('');
    try {
      const { data } = await superAdminApi.seedDemoData();
      toast.success(data.message || t('superadmin.settings.sysadmin.seedDemoSuccess'));
      setSeedOutput(data.output || '');
    } catch (err) {
      toast.error(errorMessage(err, t('superadmin.settings.sysadmin.seedDemoError')));
    } finally {
      setSeedingDemo(false);
    }
  };

  const handleFactoryResetRequest = async () => {
    if (!window.confirm(t('superadmin.settings.sysadmin.factoryResetRequestConfirm'))) return;
    setRequestingReset(true);
    try {
      const { data } = await superAdminApi.factoryResetRequest();
      toast.success(data.message || t('superadmin.settings.sysadmin.factoryResetCodeSent'));
      setResetStep('otp_sent');
    } catch (err) {
      toast.error(errorMessage(err, t('superadmin.settings.sysadmin.factoryResetRequestError')));
    } finally {
      setRequestingReset(false);
    }
  };

  const handleFactoryResetConfirm = async () => {
    if (!window.confirm(t('superadmin.settings.sysadmin.factoryResetFinalConfirm'))) return;
    setConfirmingReset(true);
    try {
      const { data } = await superAdminApi.factoryResetConfirm(resetOtp);
      toast.success(data.message || t('superadmin.settings.sysadmin.factoryResetSuccess'));
      setResetStep('idle');
      setResetOtp('');
    } catch (err) {
      toast.error(errorMessage(err, t('superadmin.settings.sysadmin.factoryResetInvalidCode')));
    } finally {
      setConfirmingReset(false);
    }
  };

  const handleCancelReset = () => {
    setResetStep('idle');
    setResetOtp('');
  };

  return (
    <>
      <PlatformModeBanner platformMode={mode} />

      <SystemOperationsPanel
        seedingDemo={seedingDemo}
        seedOutput={seedOutput}
        resetStep={resetStep}
        resetOtp={resetOtp}
        requestingReset={requestingReset}
        confirmingReset={confirmingReset}
        onSeedDemo={handleSeedDemo}
        onFactoryResetRequest={handleFactoryResetRequest}
        onFactoryResetConfirm={handleFactoryResetConfirm}
        onResetOtpChange={setResetOtp}
        onCancelReset={handleCancelReset}
      />

      <BroadcastPanel
        subject={broadcastForm.subject}
        message={broadcastForm.message}
        sending={sending}
        onSubjectChange={(v: string) => setBroadcastForm((prev) => ({ ...prev, subject: v }))}
        onMessageChange={(v: string) => setBroadcastForm((prev) => ({ ...prev, message: v }))}
        onSubmit={handleBroadcast}
      />
    </>
  );
}
