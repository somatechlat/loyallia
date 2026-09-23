/**
 * Dynamic value templates for the Wallet Pass Studio.
 *
 * Derived from the single TOKENS dictionary in pass-schema so there is only
 * one source of truth for the token vocabulary. `id` is the literal
 * `{{namespace.leaf}}` token.
 */

import type { CardType } from './unified-state';
import { TOKENS } from './pass-schema';

/** UI shape for one dynamic template, consumed by the picker and field card. */
export interface DynamicTemplate {
  id: string;
  label: string;
  description: string;
  exampleValue: string;
  /** Copy of the token's card types. Mutating it must not touch TOKENS. */
  applicableCardTypes: readonly CardType[];
}

/** Template list derived from TOKENS. Do not hand-edit — edit TOKENS instead. */
export const DYNAMIC_TEMPLATES: DynamicTemplate[] = Object.entries(TOKENS).map(
  ([token, def]) => ({
    id: token,
    label: def.label,
    description: def.description,
    exampleValue: def.example,
    applicableCardTypes: [...def.applicableCardTypes],
  })
);
