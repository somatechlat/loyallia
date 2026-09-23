/**
 * @description SVG barcode renderer supporting QR, Aztec, PDF417, Code128, and DataMatrix.
 * @param {Object} props - Component props
 * @param {string} props.type - Barcode type
 * @param {number} [props.size=48] - Render size in pixels
 * @returns JSX.Element
 */
export function BarcodeSvg({ type, size = 48 }: { type: string; size?: number }) {
  if (type === 'code_128' || type === 'pdf417') {
    const h = type === 'pdf417' ? size * 0.6 : size * 0.5;
    return (
      <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`}>
        <rect width={size} height={h} fill="white" rx={3} />
        {Array.from({ length: 24 }).map((_, i) => {
          const w = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2, 1, 1, 2][i];
          const x = i * 2 + 1;
          return <rect key={i} x={x} y={2} width={w} height={h - 4} fill="#111" />;
        })}
      </svg>
    );
  }
  if (type === 'aztec') {
    return (
      <svg width={size} height={size} viewBox="0 0 21 21">
        <rect width="21" height="21" fill="white" rx={1.5} />
        <rect x="7" y="7" width="7" height="7" fill="none" stroke="#111" strokeWidth="1" />
        <rect x="9" y="9" width="3" height="3" fill="#111" />
        <rect x="5" y="5" width="11" height="11" fill="none" stroke="#111" strokeWidth="0.7" />
        {[3,5,7,9,11,13,15,17].map(v => <rect key={`h${v}`} x={v} y={0} width="1" height="1" fill="#111" />)}
        {[3,5,7,9,11,13,15,17].map(v => <rect key={`v${v}`} x={0} y={v} width="1" height="1" fill="#111" />)}
      </svg>
    );
  }
  if (type === 'data_matrix') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16">
        <rect width="16" height="16" fill="white" rx={1} />
        <rect x="0" y="0" width="16" height="1" fill="#111" />
        <rect x="0" y="0" width="1" height="16" fill="#111" />
        {[2,4,6,8,10,12,14].map(v => <rect key={`b${v}`} x={0} y={v} width="1" height="1" fill="#111" />)}
        {[1,3,5,7,9,11,13,15].map(v => <rect key={`r${v}`} x={v} y="15" width="1" height="1" fill="#111" />)}
        {[3,5,8,10,12].map((v,i) => <rect key={`d${i}`} x={v} y={v-1} width="2" height="2" fill="#111" />)}
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 21 21">
      <rect width="21" height="21" fill="white" rx={1.5} />
      <rect x="1" y="1" width="7" height="7" fill="none" stroke="#111" strokeWidth="1.5" />
      <rect x="3" y="3" width="3" height="3" fill="#111" />
      <rect x="13" y="1" width="7" height="7" fill="none" stroke="#111" strokeWidth="1.5" />
      <rect x="15" y="3" width="3" height="3" fill="#111" />
      <rect x="1" y="13" width="7" height="7" fill="none" stroke="#111" strokeWidth="1.5" />
      <rect x="3" y="15" width="3" height="3" fill="#111" />
      <rect x="13" y="13" width="2" height="2" fill="#111" />
      <rect x="16" y="13" width="2" height="2" fill="#111" />
      <rect x="13" y="16" width="2" height="2" fill="#111" />
      <rect x="16" y="16" width="2" height="2" fill="#111" />
    </svg>
  );
}
