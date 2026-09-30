/**
 * IconRenderer resolution guarantees — every id renders something real.
 */
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { IconRenderer } from '@/components/wallet/IconRenderer';
import {
  ICON_LIBRARY,
  STAMP_MOTIF_ICONS,
  STAMP_SHAPE_ICONS,
} from '@/components/wallet/icon-library';

function svgOf(container: HTMLElement): SVGElement | null {
  return container.querySelector('svg');
}

describe('IconRenderer', () => {
  afterEach(cleanup);

  it('renders a motif as multi-path SVG with currentColor', () => {
    const { container } = render(<IconRenderer iconId="motif-coffee" className="w-4 h-4" />);
    const svg = svgOf(container);
    expect(svg).not.toBeNull();
    expect(svg!.querySelectorAll('path').length).toBeGreaterThan(1);
    expect(svg!.getAttribute('fill')).toBe('currentColor');
  });

  it('renders an empty variant as outline strokes', () => {
    const { container } = render(<IconRenderer iconId="motif-coffee-empty" />);
    const svg = svgOf(container);
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('fill')).toBe('none');
    expect(svg!.getAttribute('stroke')).toBe('currentColor');
  });

  it('renders a shape silhouette', () => {
    const { container } = render(<IconRenderer iconId="shape-heart" />);
    const svg = svgOf(container);
    expect(svg).not.toBeNull();
    expect(svg!.querySelector('path')?.getAttribute('d')).toContain('M');
  });

  it('renders a Lucide-backed icon', () => {
    const { container } = render(<IconRenderer iconId="coffee" />);
    expect(svgOf(container)).not.toBeNull();
  });

  it('falls back to a default shape for unknown ids — never an empty box', () => {
    const { container } = render(<IconRenderer iconId="does-not-exist-xyz" />);
    const svg = svgOf(container);
    expect(svg).not.toBeNull();
    expect(svg!.querySelector('path')?.getAttribute('d')).toBeTruthy();
  });

  it('falls back when iconId is missing', () => {
    const { container } = render(<IconRenderer />);
    expect(svgOf(container)).not.toBeNull();
  });

  it('renders remote images as <img>', () => {
    const { container } = render(<IconRenderer iconId="https://example.com/a.png" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/a.png');
    expect(svgOf(container)).toBeNull();
  });

  it('resolves every library icon to a non-empty render', () => {
    for (const icon of ICON_LIBRARY) {
      const { container } = render(<IconRenderer iconId={icon.id} />);
      const svg = svgOf(container);
      expect(svg, `icon ${icon.id} produced no svg`).not.toBeNull();
      const drawable = svg!.querySelectorAll('path, circle, line, rect, polyline, polygon, ellipse');
      expect(drawable.length, `icon ${icon.id} had no drawable nodes`).toBeGreaterThan(0);
      cleanup();
    }
  });

  it('resolves every motif and shape id', () => {
    const ids = [...STAMP_MOTIF_ICONS, ...STAMP_SHAPE_ICONS].map((i) => i.id);
    expect(ids.length).toBeGreaterThanOrEqual(30);
    for (const id of ids) {
      const { container } = render(<IconRenderer iconId={id} />);
      expect(svgOf(container), `missing svg for ${id}`).not.toBeNull();
      cleanup();
    }
  });
});
