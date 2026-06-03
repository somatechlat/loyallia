'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import toast from 'react-hot-toast';
import PlatformSettingsSection from '@/components/superadmin/settings/PlatformSettingsSection';
import { PlatformSetting } from '@/components/superadmin/settings/types';
import api from '@/lib/api';

interface PlatformSettingsProps {
  settings: PlatformSetting[];
  mode: 'development' | 'production';
  onRefresh: () => void;
}

export default function PlatformSettings({
  settings,
  mode,
  onRefresh,
}: PlatformSettingsProps) {
  const { t } = useI18n();
  const [settingForm, setSettingForm] = useState<Record<string, string>>({});
  const [savingSetting, setSavingSetting] = useState<string | null>(null);

  useEffect(() => {
    const initialForm: Record<string, string> = {};
    settings.forEach((s) => { initialForm[s.key] = s.value; });
    initialForm['PLATFORM_MODE'] = mode;
    setSettingForm(initialForm);
  }, [settings, mode]);

  const updateSetting = async (key: string) => {
    const value = settingForm[key];
    if (value === undefined) return;
    setSavingSetting(key);
    try {
      const { data } = await api.put(`/api/v1/admin/platform/settings/${key}/`, { value });
      toast.success(data.message || t('superadmin.settings.platform.settingUpdated', { key }));
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('superadmin.settings.platform.updateError', { key });
      toast.error(msg);
    } finally {
      setSavingSetting(null);
    }
  };

  return (
    <PlatformSettingsSection
      settings={settings}
      form={settingForm}
      savingKey={savingSetting}
      onChange={(key: string, value: string) => setSettingForm((prev) => ({ ...prev, [key]: value }))}
      onSave={updateSetting}
    />
  );
}
