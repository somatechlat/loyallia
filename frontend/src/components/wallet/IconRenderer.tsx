'use client';

import { getIconById } from './icon-library';

interface IconRendererProps {
  iconId?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function IconRenderer({ iconId, className, style }: IconRendererProps) {
  if (!iconId) return null;

  if (iconId.startsWith('http') || iconId.startsWith('/') || iconId.startsWith('data:')) {
    return <img src={iconId} alt="" className={className} style={style} />;
  }

  const icon = getIconById(iconId);
  if (!icon?.svgPath) return null;

  return (
    <svg className={className} style={style} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d={icon.svgPath} />
    </svg>
  );
}
