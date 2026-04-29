/**
 * Shared types for program type configuration components.
 *
 * Extracted from TypeConfig.tsx as part of LYL-C-FE-002 (mega-component decomposition).
 */

/** Props for all type-specific config components. */
export type ConfigProps = {
  meta: Record<string, unknown>;
  setMeta: (m: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)) => void;
};
