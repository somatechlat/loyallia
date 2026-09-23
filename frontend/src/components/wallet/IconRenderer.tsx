'use client';

import { getIconById } from './icon-library';
import { getLucideIcon } from './lucide-icon-map';

interface IconRendererProps {
  iconId?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders wallet pass icons from symbolic IDs.
 * Resolution order: URL/data → Lucide component → custom SVG path.
 */
export function IconRenderer({ iconId, className, style }: IconRendererProps) {
  if (!iconId) return null;

  if (iconId.startsWith('http') || iconId.startsWith('/') || iconId.startsWith('data:')) {
    return <img src={iconId} alt="" className={className} style={style} />;
  }

  const icon = getIconById(iconId);
  if (!icon) return null;

  if (icon.lucideName) {
    const LucideIcon = getLucideIcon(icon.lucideName);
    if (LucideIcon) {
      return <LucideIcon className={className} style={style} aria-hidden="true" />;
    }
  }

  if (icon.svgPath) {
    return (
      <svg
        className={className}
        style={style}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={icon.svgPath} />
      </svg>
    );
  }

  return null;
}
