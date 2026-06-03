import { useI18n } from "@/lib/i18n";
import { Mail, Smartphone, MessageCircle, Wallet } from "@/components/ui/LucideIcons";

interface ChannelBadgeProps {
  channel?: string;
}

export default function ChannelBadge({ channel }: ChannelBadgeProps) {
  const { t } = useI18n();
  const configs: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
    email: { icon: <Mail className="w-3 h-3" />, bg: "bg-blue-100", text: "text-blue-700", label: t("campaigns.email") },
    wallet: { icon: <Wallet className="w-3 h-3" />, bg: "bg-purple-100", text: "text-purple-700", label: t("campaigns.wallet") },
    in_app: { icon: <Wallet className="w-3 h-3" />, bg: "bg-purple-100", text: "text-purple-700", label: t("campaigns.wallet") },
    whatsapp: { icon: <MessageCircle className="w-3 h-3" />, bg: "bg-emerald-100", text: "text-emerald-700", label: t("campaigns.whatsapp") },
    sms: { icon: <Smartphone className="w-3 h-3" />, bg: "bg-orange-100", text: "text-orange-700", label: t("campaigns.sms") },
  };
  const cfg = configs[channel || "email"] || configs.email!;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
