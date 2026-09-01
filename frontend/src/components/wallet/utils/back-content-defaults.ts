/**
 * Default back-of-pass content per card type.
 *
 * SRS-008 Section 7 — Every pass should include terms, contact, and rules
 * by default. Users can edit or remove them.
 */

import type { BackField, BackLink, BackContent, LinkType } from '@/components/wallet/types/unified-state';
import type { CardType } from '@/components/wallet/types/unified-state';

function makeBackField(label: string, value: string, id?: string): BackField {
  return {
    id: id || `back-${crypto.randomUUID()}`,
    label,
    value,
    isLink: false,
    order: 0,
  };
}

function makeBackLink(type: LinkType, url: string, label: string): BackLink {
  return { id: `link-${crypto.randomUUID()}`, type, url, label };
}

const TERMS_LABEL = 'TÉRMINOS Y CONDICIONES';
const CONTACT_LABEL = 'CONTACTO';
const RULES_LABEL = 'REGLAS DEL PROGRAMA';

const DEFAULT_TERMS =
  'Este programa de fidelidad está sujeto a términos y condiciones. La empresa se reserva el derecho de modificar o cancelar el programa en cualquier momento. Los beneficios no son transferibles ni canjeables por dinero en efectivo.';

const DEFAULT_CONTACT = 'soporte@tuempresa.com';
const DEFAULT_WEBSITE = 'https://www.tuempresa.com';

const CARD_TYPE_RULES: Record<CardType, string> = {
  stamp:
    '• 1 sello por compra válida.\n• La recompensa se otorga al completar todos los sellos.\n• Los sellos no tienen valor monetario.\n• No acumulable con otras promociones.',
  cashback:
    '• El cashback se acumula por cada compra válida.\n• El porcentaje de reembolso varía según el nivel.\n• El saldo no tiene valor monetario directo.\n• Sujeto a términos adicionales del comercio.',
  coupon:
    '• Válido por un solo uso por cliente.\n• No canjeable por dinero en efectivo.\n• No acumulable con otras ofertas o descuentos.\n• La empresa se reserva el derecho de finalizar la promoción.',
  affiliate:
    '• Comparte tu código de referido con amigos.\n• Recibe recompensas cuando tus referidos se unan.\n• Las recompensas se otorgan según las condiciones del programa.\n• No válido para uso comercial masivo.',
  discount:
    '• Los descuentos varían según el nivel alcanzado.\n• Aplican restricciones en productos seleccionados.\n• No acumulable con otras promociones.\n• La empresa puede modificar los niveles y beneficios.',
  gift_certificate:
    '• Válido para canje en establecimientos participantes.\n• No canjeable por dinero en efectivo.\n• No se reembolsa el saldo no utilizado.\n• Sujeto a disponibilidad y términos del comercio.',
  vip_membership:
    '• La membresía otorga beneficios exclusivos.\n• Los beneficios están sujetos a disponibilidad.\n• La empresa puede modificar los beneficios con previo aviso.\n• No transferible a terceros.',
  corporate_discount:
    '• Válido solo para empleados registrados.\n• Se requiere identificación para canjear.\n• No transferible a personas externas.\n• La empresa puede modificar o cancelar el descuento.',
  referral_pass:
    '• Comparte tu enlace de referido con amigos.\n• Recibe recompensas cuando tus referidos realicen su primera compra.\n• Las recompensas tienen un límite mensual.\n• No válido para uso automatizado o masivo.',
  multipass:
    '• Válido para el número de sesiones indicadas.\n• Las sesiones no utilizadas no son reembolsables.\n• Válido por el período especificado desde la compra.\n• No transferible a terceros.',
};

/**
 * Generate default back content for a given card type.
 * Returns terms, contact, rules, website link, and privacy link.
 */
export function getDefaultBackContent(cardType: CardType): BackContent {
  const rules = CARD_TYPE_RULES[cardType] || CARD_TYPE_RULES.stamp;

  return {
    fields: [
      makeBackField(RULES_LABEL, rules, `back-rules-${cardType}`),
      makeBackField(TERMS_LABEL, DEFAULT_TERMS, `back-terms-${cardType}`),
      makeBackField(CONTACT_LABEL, DEFAULT_CONTACT, `back-contact-${cardType}`),
    ],
    links: [
      makeBackLink('website', DEFAULT_WEBSITE, 'Visitar sitio web'),
      makeBackLink('email', `mailto:${DEFAULT_CONTACT}`, 'Enviar email'),
    ],
    detailImages: [],
  };
}

/**
 * Check if back content appears to be empty or default-only.
 * Used to decide whether to auto-populate when card type changes.
 */
export function isBackContentEmptyOrDefault(backContent: BackContent): boolean {
  const hasCustomFields = backContent.fields.some(
    (f) =>
      f.value !== DEFAULT_TERMS &&
      f.value !== DEFAULT_CONTACT &&
      !Object.values(CARD_TYPE_RULES).includes(f.value)
  );
  const hasCustomLinks = backContent.links.some(
    (l) => l.url !== DEFAULT_WEBSITE && l.url !== `mailto:${DEFAULT_CONTACT}`
  );
  return !hasCustomFields && !hasCustomLinks;
}
