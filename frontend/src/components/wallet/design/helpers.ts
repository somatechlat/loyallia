export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const APPLE_FIELD_REGISTRY = [
  { label: 'Nombre del cliente', value: '{customer_name}', types: 'all' as const },
  { label: 'Sellos actuales', value: '{stamp_count}/{stamps_required}', types: ['stamp'] as const },
  { label: 'Recompensa', value: '{reward_description}', types: ['stamp'] as const },
  { label: 'Saldo de cashback', value: '${cashback_balance}', types: ['cashback'] as const },
  { label: 'Nombre del programa', value: '{program_name}', types: 'all' as const },
  { label: 'Descripción', value: '{description}', types: 'all' as const },
  { label: 'Nivel de descuento', value: '{discount_tier}', types: ['discount'] as const },
  { label: 'Porcentaje de descuento', value: '{discount_percentage}%', types: ['discount', 'coupon', 'corporate_discount'] as const },
  { label: 'Membresía VIP', value: '{membership_tier}', types: ['vip_membership'] as const },
  { label: 'Referidos', value: '{referrals_made}', types: ['referral_pass'] as const },
  { label: 'Código de referido', value: '{referral_code}', types: ['referral_pass'] as const },
  { label: 'Usos restantes', value: '{multipass_remaining}/{bundle_size}', types: ['multipass'] as const },
  { label: 'Saldo de regalo', value: '${gift_balance}', types: ['gift_certificate'] as const },
  { label: 'Descuento corporativo', value: '{corporate_discount}%', types: ['corporate_discount'] as const },
  { label: 'Empresa', value: '{company_name}', types: ['corporate_discount'] as const },
  { label: 'Usos del cupón', value: '{coupon_usage}', types: ['coupon'] as const },
  { label: 'Válido hasta', value: '{coupon_end_date}', types: ['coupon'] as const },
  { label: 'Términos del cupón', value: '{coupon_terms}', types: ['coupon'] as const },
  { label: 'Recompensa de referido', value: '{referrer_reward}', types: ['referral_pass'] as const },
  { label: 'Código de afiliado', value: '{affiliate_code}', types: ['affiliate'] as const },
  { label: 'Fecha de inscripción', value: '{enrolled_date}', types: ['affiliate'] as const },
  { label: 'Texto personalizado...', value: 'custom', types: 'all' as const },
] as const;

export function getAppleFieldOptions(cardType: string) {
  return APPLE_FIELD_REGISTRY.filter(f => f.types === 'all' || (Array.isArray(f.types) && f.types.includes(cardType)));
}

export const GOOGLE_FIELD_REGISTRY = [
  { label: 'Nombre del cliente', fieldPath: 'object.accountName', defaultDisplayName: 'Cliente', types: 'all' as const },
  { label: 'Nombre del programa', fieldPath: 'class.programName', defaultDisplayName: 'Programa', types: 'all' as const },
  { label: 'Nombre del negocio', fieldPath: 'class.issuerName', defaultDisplayName: 'Negocio', types: 'all' as const },
  { label: 'Puntos de lealtad', fieldPath: 'object.loyaltyPoints.balance', defaultDisplayName: 'Puntos', types: ['stamp', 'cashback', 'affiliate', 'vip_membership', 'multipass'] as const },
  { label: 'Etiqueta de puntos', fieldPath: 'object.loyaltyPoints.label', defaultDisplayName: 'Etiqueta', types: ['stamp', 'cashback', 'affiliate', 'vip_membership', 'multipass'] as const },
  { label: 'Balance secundario', fieldPath: 'object.secondaryLoyaltyPoints.balance', defaultDisplayName: 'Balance 2', types: ['cashback'] as const },
  { label: 'Válido hasta', fieldPath: 'object.validTimeInterval.end.date', defaultDisplayName: 'Válido', types: ['coupon'] as const },
  { label: 'Detalles', fieldPath: 'object.details', defaultDisplayName: 'Detalles', types: ['discount', 'corporate_discount'] as const },
  { label: 'Saldo de regalo', fieldPath: 'object.balance.money', defaultDisplayName: 'Saldo', types: ['gift_certificate'] as const },
  { label: 'Personalizado...', fieldPath: 'custom', defaultDisplayName: '', types: 'all' as const },
] as const;

export function getGoogleFieldOptions(cardType: string) {
  return GOOGLE_FIELD_REGISTRY.filter(f => f.types === 'all' || (Array.isArray(f.types) && f.types.includes(cardType)));
}

export const APPLE_GROUP_META: Record<string, { borderColor: string; badge: string; hint: string }> = {
  backFields: { borderColor: 'border-l-surface-400', badge: 'bg-surface-100 dark:bg-surface-700/50 text-surface-700 dark:text-surface-300', hint: '🔄 Detrás de la tarjeta' },
  headerFields:   { borderColor: 'border-l-amber-500',   badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', hint: '↗️ Esquina superior derecha' },
  primaryFields:  { borderColor: 'border-l-emerald-500', badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', hint: '🔠 Texto grande central' },
  secondaryFields:{ borderColor: 'border-l-indigo-500',  badge: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300', hint: '📊 Debajo del principal' },
  auxiliaryFields:{ borderColor: 'border-l-slate-400',   badge: 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300', hint: '📋 Parte inferior' },
};
