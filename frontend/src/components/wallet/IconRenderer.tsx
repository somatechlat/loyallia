'use client';

import React from 'react';
import { getIconById, type IconDefinition } from './icon-library';
import { getLucideIcon } from './lucide-icon-map';

interface IconRendererProps {
  iconId?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Paint multi-path motifs as outlines (empty stamp slots). */
  outline?: boolean;
}

/** Fallback silhouette — never render an empty box. */
const FALLBACK_PATH = 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z';

function MotifSvg({
  paths,
  outline,
  className,
  style,
}: {
  paths: string[];
  outline?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill={outline ? 'none' : 'currentColor'}
      stroke={outline ? 'currentColor' : 'none'}
      strokeWidth={outline ? 1.75 : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

function renderDefinition(
  icon: IconDefinition,
  outline: boolean | undefined,
  className?: string,
  style?: React.CSSProperties,
) {
  const asOutline = outline ?? icon.outline;

  if (icon.svgPaths && icon.svgPaths.length > 0) {
    return (
      <MotifSvg
        paths={icon.svgPaths}
        outline={asOutline}
        className={className}
        style={style}
      />
    );
  }

  if (icon.lucideName) {
    const LucideIcon = getLucideIcon(icon.lucideName);
    if (LucideIcon) {
      return (
        <LucideIcon
          className={className}
          style={style}
          strokeWidth={asOutline ? 1.75 : 2}
          aria-hidden="true"
        />
      );
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

  return (
    <MotifSvg
      paths={[FALLBACK_PATH]}
      outline
      className={className}
      style={style}
    />
  );
}

/**
 * Renders wallet pass icons from symbolic IDs.
 *
 * Resolution order: URL/data image → library motif → Lucide component →
 * custom SVG path → default circle. Never renders a broken or empty box.
 */
export function IconRenderer({ iconId, className, style, outline }: IconRendererProps) {
  if (iconId && (iconId.startsWith('http') || iconId.startsWith('/') || iconId.startsWith('data:'))) {
    return <img src={iconId} alt="" className={className} style={style} />;
  }

  const icon = iconId ? getIconById(iconId) : undefined;

  if (!icon) {
    return (
      <MotifSvg
        paths={[FALLBACK_PATH]}
        outline
        className={className}
        style={style}
      />
    );
  }

  return renderDefinition(icon, outline, className, style);
}
