/**
 * @description SVG barcode renderer.
 * QR is encoded via `qrcode.react`; Code128 via a pure-TS encoder.
 * Formats without a real encoder render a deterministic hash-pattern with a
 * visible "preview" badge so the UI never silently fakes a scannable code.
 */
import { QRCodeSVG } from 'qrcode.react';
import { encodeCode128B } from './utils/code128';

export interface BarcodeSvgProps {
  /** Barcode type (snake_case, e.g. 'qr_code', 'code_128') */
  type: string;
  /** Render size in pixels */
  size?: number;
  /** Payload encoded into the barcode */
  message?: string;
}

/** Deterministic FNV-1a hash for fallback patterns. */
function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic pseudo-random grid used when a format cannot be encoded. */
function hashPattern(message: string, cols: number, rows: number): boolean[][] {
  let state = fnv1a(message || 'preview');
  const cells: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < cols; c++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      row.push((state & 0xff) > 127);
    }
    cells.push(row);
  }
  return cells;
}

function HashPatternSvg({ message, rectangular }: { message: string; rectangular: boolean }) {
  const cols = rectangular ? 32 : 16;
  const rows = rectangular ? 8 : 16;
  const badgeH = 3;
  const viewH = rows + badgeH + 1;
  const cells = hashPattern(message, cols, rows);
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${cols} ${viewH}`}
      preserveAspectRatio="none"
      data-testid="barcode-preview-placeholder"
    >
      <rect width={cols} height={viewH} fill="white" />
      <g transform={`translate(0, ${badgeH})`}>
        {cells.map((row, r) =>
          row.map((on, c) =>
            on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#111" /> : null
          )
        )}
      </g>
      <rect x={0} y={0} width={cols} height={badgeH} fill="#b45309" />
      <text
        x={cols / 2}
        y={badgeH * 0.78}
        textAnchor="middle"
        fill="#fff"
        fontSize={2.2}
        fontFamily="system-ui, sans-serif"
        fontWeight={700}
      >
        preview
      </text>
    </svg>
  );
}

function Code128Svg({ message }: { message: string }) {
  const widths = encodeCode128B(message);
  if (!widths) return <HashPatternSvg message={message} rectangular />;
  const totalModules = widths.reduce((a, b) => a + b, 0);
  const quiet = 10;
  const viewW = totalModules + quiet * 2;
  const viewH = 20;
  const rects: React.ReactNode[] = [];
  let x = quiet;
  for (let i = 0; i < widths.length; i += 2) {
    const w = widths[i] ?? 0;
    rects.push(<rect key={i} x={x} y={0} width={w} height={viewH} fill="#111" />);
    x += w + (widths[i + 1] ?? 0);
  }
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${viewW} ${viewH}`} preserveAspectRatio="none">
      <rect width={viewW} height={viewH} fill="white" />
      {rects}
    </svg>
  );
}

/**
 * @description SVG barcode renderer supporting real QR + Code128, with an
 * explicitly badged preview pattern for formats lacking a free encoder.
 */
export function BarcodeSvg({ type, size = 48, message }: BarcodeSvgProps) {
  const normalized = (type || 'qr_code').toLowerCase().replace(/-/g, '_');
  const payload = message?.trim() ? message : 'PREVIEW';
  const isWide = normalized === 'code_128' || normalized === 'code128' || normalized === 'pdf417';
  const width = isWide ? Math.round(size * 1.6) : size;
  const height = isWide ? Math.round(size * 0.5) : size;

  if (normalized === 'qr_code' || normalized === 'qr') {
    return (
      <div data-testid="barcode-qr" style={{ width: size, height: size, background: '#ffffff' }}>
        <QRCodeSVG value={payload} size={size} level="M" bgColor="#ffffff" fgColor="#111111" />
      </div>
    );
  }

  if (normalized === 'code_128' || normalized === 'code128') {
    return (
      <div data-testid="barcode-code128" style={{ width, height, background: '#ffffff' }}>
        <Code128Svg message={payload} />
      </div>
    );
  }

  return (
    <div
      data-testid="barcode-unencodable"
      style={{ width, height, background: '#ffffff' }}
    >
      <HashPatternSvg message={payload} rectangular={isWide} />
    </div>
  );
}
