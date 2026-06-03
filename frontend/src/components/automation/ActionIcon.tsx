import { ACTION_ICON_PATHS } from "@/lib/automationConstants";

interface ActionIconProps {
  action: string;
  className?: string;
}

export default function ActionIcon({ action, className = "w-5 h-5" }: ActionIconProps) {
  const d = ACTION_ICON_PATHS[action] || ACTION_ICON_PATHS.send_notification;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
