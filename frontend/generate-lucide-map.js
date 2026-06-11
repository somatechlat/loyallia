const fs = require('fs');
const content = fs.readFileSync('src/components/wallet/icon-library.ts', 'utf8');
const lucideNames = [...content.matchAll(/lucide\('[^']+',\s*'[^']+',\s*'[^']+',\s*'([^']+)'\)/g)].map(m => m[1]);
const unique = [...new Set(lucideNames)].sort();

const imports = unique.map(n => `  ${n},`).join('\n');
const mapEntries = unique.map(n => `    ${n}: ${n},`).join('\n');

const file = `/**
 * Auto-generated Lucide icon mapping for the Wallet Pass Studio.
 * Imports all Lucide icons referenced in icon-library.ts.
 */
import React from 'react';
import type { LucideProps } from 'lucide-react';
import {
${imports}
} from 'lucide-react';

export const LUCIDE_ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
${mapEntries}
};

export function getLucideIcon(name: string): React.ComponentType<LucideProps> | undefined {
  return LUCIDE_ICON_MAP[name];
}
`;

fs.writeFileSync('src/components/wallet/lucide-icon-map.tsx', file);
console.log('Generated src/components/wallet/lucide-icon-map.tsx with', unique.length, 'icons');
