/**
 * Back-of-pass content types for the Wallet Pass Studio unified v2 model.
 */

import type { LinkType } from './unified-state';

export interface BackField {
  id: string;
  label: string;
  value: string;
  isLink: boolean;
  linkUrl?: string;
  linkType?: LinkType;
  order: number;
}

export interface BackLink {
  id: string;
  type: LinkType;
  url: string;
  label: string;
  icon?: string;
}

export interface DetailImage {
  url: string;
  width: number;
  height: number;
  description?: string;
}

export interface AppLinkConfig {
  iosAppId?: string;
  iosAppLink?: string;
  androidAppPackage?: string;
  androidAppLink?: string;
}

export interface BackContent {
  fields: BackField[];
  links: BackLink[];
  detailImages: DetailImage[];
  appLink?: AppLinkConfig;
  termsAndConditions?: string;
}

export interface BackContentDefaults {
  stamp: BackContent;
  cashback: BackContent;
  coupon: BackContent;
  affiliate: BackContent;
  discount: BackContent;
  gift_certificate: BackContent;
  vip_membership: BackContent;
  corporate_discount: BackContent;
  referral_pass: BackContent;
  multipass: BackContent;
}

/* Default back content helpers */

function makeBackField(
  id: string,
  label: string,
  value: string,
  overrides?: Partial<BackField>
): BackField {
  return {
    id,
    label,
    value,
    isLink: false,
    order: 0,
    ...overrides,
  };
}

function makeBackLink(
  id: string,
  type: LinkType,
  url: string,
  label: string
): BackLink {
  return { id, type, url, label };
}

/* ── Card-type-specific default back content ─────────────────────── */

const stampBackContent = (): BackContent => ({
  fields: [
    makeBackField('rules', 'REGLAS DEL PROGRAMA', '• 1 sello por compra mayor a $5\n• Recompensa: café gratis\n• No acumulable con otras promociones'),
    makeBackField('terms', 'TÉRMINOS Y CONDICIONES', 'Participa acumulando sellos en cada compra. Válido por 12 meses desde la emisión.'),
    makeBackField('contact', 'CONTACTO', 'contacto@negocio.com', { isLink: true, linkUrl: 'mailto:contacto@negocio.com', linkType: 'email' }),
  ],
  links: [
    makeBackLink('website', 'website', 'https://negocio.com', 'Sitio Web'),
  ],
  detailImages: [],
});

const cashbackBackContent = (): BackContent => ({
  fields: [
    makeBackField('rules', 'REGLAS DEL PROGRAMA', '• 5% cashback en todas las compras\n• Mínimo de compra: $50\n• Crédito expira en 90 días'),
    makeBackField('terms', 'TÉRMINOS Y CONDICIONES', 'El cashback se acredita automáticamente en tu cuenta. No aplicable a promociones especiales.'),
    makeBackField('contact', 'CONTACTO', 'contacto@negocio.com', { isLink: true, linkUrl: 'mailto:contacto@negocio.com', linkType: 'email' }),
  ],
  links: [
    makeBackLink('website', 'website', 'https://negocio.com', 'Sitio Web'),
  ],
  detailImages: [],
});

const couponBackContent = (): BackContent => ({
  fields: [
    makeBackField('rules', 'REGLAS DEL PROGRAMA', '• Válido hasta la fecha de expiración\n• No acumulable con otras promociones\n• Un uso por cliente'),
    makeBackField('terms', 'TÉRMINOS Y CONDICIONES', 'Este cupón tiene validez limitada. Presenta el pase en caja para aplicar el descuento.'),
    makeBackField('contact', 'CONTACTO', 'contacto@negocio.com', { isLink: true, linkUrl: 'mailto:contacto@negocio.com', linkType: 'email' }),
  ],
  links: [
    makeBackLink('website', 'website', 'https://negocio.com', 'Sitio Web'),
  ],
  detailImages: [],
});

const affiliateBackContent = (): BackContent => ({
  fields: [
    makeBackField('rules', 'REGLAS DEL PROGRAMA', '• Comparte tu código con amigos\n• Gana recompensas por cada referido\n• Sin límite de referidos'),
    makeBackField('terms', 'TÉRMINOS Y CONDICIONES', 'Las recompensas se acreditan cuando el referido realiza su primera compra.'),
    makeBackField('contact', 'CONTACTO', 'contacto@negocio.com', { isLink: true, linkUrl: 'mailto:contacto@negocio.com', linkType: 'email' }),
  ],
  links: [
    makeBackLink('website', 'website', 'https://negocio.com', 'Sitio Web'),
  ],
  detailImages: [],
});

const discountBackContent = (): BackContent => ({
  fields: [
    makeBackField('rules', 'REGLAS DEL PROGRAMA', '• Descuentos progresivos según nivel\n• Actualización de nivel mensual\n• Beneficios exclusivos por tier'),
    makeBackField('terms', 'TÉRMINOS Y CONDICIONES', 'Los descuentos se aplican automáticamente al alcanzar cada nivel. No combinables.'),
    makeBackField('contact', 'CONTACTO', 'contacto@negocio.com', { isLink: true, linkUrl: 'mailto:contacto@negocio.com', linkType: 'email' }),
  ],
  links: [
    makeBackLink('website', 'website', 'https://negocio.com', 'Sitio Web'),
  ],
  detailImages: [],
});

const giftCertificateBackContent = (): BackContent => ({
  fields: [
    makeBackField('rules', 'REGLAS DEL PROGRAMA', '• No refundable\n• Válido por 12 meses desde la emisión\n• Aplicable a todos los productos'),
    makeBackField('terms', 'TÉRMINOS Y CONDICIONES', 'La tarjeta regalo no tiene valor en efectivo. No reemplazable si se pierde.'),
    makeBackField('contact', 'CONTACTO', 'contacto@negocio.com', { isLink: true, linkUrl: 'mailto:contacto@negocio.com', linkType: 'email' }),
  ],
  links: [
    makeBackLink('website', 'website', 'https://negocio.com', 'Sitio Web'),
  ],
  detailImages: [],
});

const vipMembershipBackContent = (): BackContent => ({
  fields: [
    makeBackField('rules', 'REGLAS DEL PROGRAMA', '• Acceso 24/7 a instalaciones\n• Clases ilimitadas incluidas\n• Spa & sauna premium'),
    makeBackField('terms', 'TÉRMINOS Y CONDICIONES', 'Membresía con renovación automática. Cancela con 30 días de anticipación.'),
    makeBackField('contact', 'CONTACTO', 'contacto@negocio.com', { isLink: true, linkUrl: 'mailto:contacto@negocio.com', linkType: 'email' }),
  ],
  links: [
    makeBackLink('website', 'website', 'https://negocio.com', 'Sitio Web'),
  ],
  detailImages: [],
});

const corporateDiscountBackContent = (): BackContent => ({
  fields: [
    makeBackField('rules', 'REGLAS DEL PROGRAMA', '• Descuentos exclusivos para empleados\n• Presente identificación corporativa\n• Válido de lunes a viernes'),
    makeBackField('terms', 'TÉRMINOS Y CONDICIONES', 'Beneficio exclusivo para empleados registrados. No transferible.'),
    makeBackField('contact', 'CONTACTO', 'contacto@negocio.com', { isLink: true, linkUrl: 'mailto:contacto@negocio.com', linkType: 'email' }),
  ],
  links: [
    makeBackLink('website', 'website', 'https://negocio.com', 'Sitio Web'),
  ],
  detailImages: [],
});

const referralPassBackContent = (): BackContent => ({
  fields: [
    makeBackField('rules', 'REGLAS DEL PROGRAMA', '• Comparte tu código de referido\n• Tu amigo obtiene un descuento de bienvenida\n• Tú ganas crédito por cada compra de tu amigo'),
    makeBackField('terms', 'TÉRMINOS Y CONDICIONES', 'El crédito se acredita después de que el referido complete su primera compra.'),
    makeBackField('contact', 'CONTACTO', 'contacto@negocio.com', { isLink: true, linkUrl: 'mailto:contacto@negocio.com', linkType: 'email' }),
  ],
  links: [
    makeBackLink('website', 'website', 'https://negocio.com', 'Sitio Web'),
  ],
  detailImages: [],
});

const multipassBackContent = (): BackContent => ({
  fields: [
    makeBackField('rules', 'REGLAS DEL PROGRAMA', '• Paquete de sesiones prepagadas\n• Válido por 6 meses desde la compra\n• No transferable'),
    makeBackField('terms', 'TÉRMINOS Y CONDICIONES', 'Las sesiones no utilizadas expiran al final del período de validez. No reembolsable.'),
    makeBackField('contact', 'CONTACTO', 'contacto@negocio.com', { isLink: true, linkUrl: 'mailto:contacto@negocio.com', linkType: 'email' }),
  ],
  links: [
    makeBackLink('website', 'website', 'https://negocio.com', 'Sitio Web'),
  ],
  detailImages: [],
});

export const defaultBackContentDefaults: BackContentDefaults = {
  stamp: stampBackContent(),
  cashback: cashbackBackContent(),
  coupon: couponBackContent(),
  affiliate: affiliateBackContent(),
  discount: discountBackContent(),
  gift_certificate: giftCertificateBackContent(),
  vip_membership: vipMembershipBackContent(),
  corporate_discount: corporateDiscountBackContent(),
  referral_pass: referralPassBackContent(),
  multipass: multipassBackContent(),
};
