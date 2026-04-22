import Tooltip from '@/components/ui/Tooltip';

/* ─── Type-specific configuration fields ──────────────────────────────── */
function TypeConfig({ type, meta, setMeta }: { type: string; meta: Record<string, unknown>; setMeta: (m: Record<string, unknown>) => void }) {
  const set = (k: string, v: unknown) => setMeta({ ...meta, [k]: v });

  switch (type) {
    case 'stamp':
      return (
        <div className="space-y-5">
          {/* Stamp Type Selector — STAMP-002/004 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="label mb-0">Tipo de sello</label>
              <Tooltip text="Elige cómo tus clientes ganarán sellos: por cada visita individual o basado en el consumo monetario." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                (meta.stamp_type ?? 'visit') === 'visit' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-surface-200 dark:border-surface-700'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <input type="radio" name="stamp_type" value="visit" checked={(meta.stamp_type ?? 'visit') === 'visit'}
                    onChange={() => set('stamp_type', 'visit')} className="accent-brand-500" />
                  <span className="font-semibold text-sm text-surface-900 dark:text-white">Otorgar sello por visita</span>
                  <Tooltip text="Por cada consumo que tenga tu cliente, independientemente del monto, se le otorgará un sello." />
                </div>
                <p className="text-xs text-surface-500 ml-5">1 visita = 1 sello</p>
              </label>
              <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                meta.stamp_type === 'consumption' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-surface-200 dark:border-surface-700'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <input type="radio" name="stamp_type" value="consumption" checked={meta.stamp_type === 'consumption'}
                    onChange={() => set('stamp_type', 'consumption')} className="accent-brand-500" />
                  <span className="font-semibold text-sm text-surface-900 dark:text-white">Otorgar sello por consumo</span>
                  <Tooltip text="Tú decides cuánto consumo equivale a un sello. Es obligatorio poner la equivalencia." />
                </div>
                <p className="text-xs text-surface-500 ml-5">$X consumo = 1 sello</p>
              </label>
            </div>
            {/* Consumption Equivalence Panel — STAMP-005 */}
            {meta.stamp_type === 'consumption' && (
              <div className="mt-3 p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
                <label className="label">Equivalencia consumo-sello</label>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-surface-500">$</span>
                  <input type="number" min={1} step={0.01} className="input w-24"
                    value={meta.consumption_per_stamp as number ?? 10}
                    onChange={e => set('consumption_per_stamp', parseFloat(e.target.value) || 10)} />
                  <span className="text-sm text-surface-600 dark:text-surface-400">dólares en consumo equivale a 1 sello</span>
                </div>
              </div>
            )}
          </div>

          {/* Stamps Required — existing functionality */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="label mb-0">Sellos requeridos para la recompensa</label>
              <Tooltip text="Cantidad total de sellos que el cliente debe acumular para obtener su recompensa." />
            </div>
            <input type="number" min={1} max={99} className="input" value={meta.stamps_required as number ?? 10}
              onChange={e => set('stamps_required', parseInt(e.target.value) || 10)} />
          </div>

          {/* Reward Description */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="label mb-0">Descripción de la recompensa</label>
              <Tooltip text="El premio que obtendrá el cliente al completar todos los sellos." />
            </div>
            <input type="text" className="input" placeholder="Ej: Plato a la carta gratis" value={meta.reward_description as string ?? ''}
              onChange={e => set('reward_description', e.target.value)} />
          </div>

          {/* Expiry Options — STAMP-010/011 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="label mb-0">Vigencia de la tarjeta</label>
              <Tooltip text="Define si la tarjeta tiene vencimiento o es ilimitada. Si es ilimitada, se reinicia al completar todos los sellos." />
            </div>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                (meta.stamp_expiry ?? 'unlimited') === 'unlimited' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-surface-200 dark:border-surface-700'
              }`}>
                <input type="radio" name="stamp_expiry" value="unlimited" checked={(meta.stamp_expiry ?? 'unlimited') === 'unlimited'}
                  onChange={() => set('stamp_expiry', 'unlimited')} className="accent-brand-500" />
                <span className="text-sm text-surface-900 dark:text-white font-medium">Ilimitado</span>
                <Tooltip text="La tarjeta no tiene fecha de vencimiento. Al completar los sellos, se reinicia de nuevo a 0." />
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                meta.stamp_expiry === 'period' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-surface-200 dark:border-surface-700'
              }`}>
                <input type="radio" name="stamp_expiry" value="period" checked={meta.stamp_expiry === 'period'}
                  onChange={() => set('stamp_expiry', 'period')} className="accent-brand-500" />
                <span className="text-sm text-surface-900 dark:text-white font-medium">Por periodo de tiempo</span>
              </label>
            </div>
            {meta.stamp_expiry === 'period' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="label">Fecha de inicio</label>
                  <input type="date" className="input" value={meta.stamp_start_date as string ?? ''}
                    onChange={e => set('stamp_start_date', e.target.value)} />
                </div>
                <div>
                  <label className="label">Fecha de fin</label>
                  <input type="date" className="input" value={meta.stamp_end_date as string ?? ''}
                    min={meta.stamp_start_date as string ?? ''}
                    onChange={e => set('stamp_end_date', e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Additional Config — STAMP-012/013/014 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="label mb-0">Sellos al emitir</label>
                <Tooltip text="Cantidad de sellos de bonificación que se otorgan cuando el cliente agrega la tarjeta a su wallet." />
              </div>
              <input type="number" min={0} max={10} className="input" value={meta.stamps_at_issue as number ?? 0}
                onChange={e => set('stamps_at_issue', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="label mb-0">Límite por día</label>
                <Tooltip text="Cantidad máxima de sellos que un cliente puede ganar en un solo día." />
              </div>
              <input type="number" min={1} max={99} className="input" value={meta.daily_stamp_limit as number ?? 5}
                onChange={e => set('daily_stamp_limit', parseInt(e.target.value) || 5)} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="label mb-0">Sellos cumpleaños</label>
                <Tooltip text="Sellos extra que se otorgan al cliente el día de su cumpleaños. Requiere fecha de nacimiento en el formulario de registro." />
              </div>
              <input type="number" min={0} max={10} className="input" value={meta.birthday_stamps as number ?? 0}
                onChange={e => set('birthday_stamps', parseInt(e.target.value) || 0)} />
            </div>
          </div>
        </div>
      );
    case 'cashback':
      return (
        <div className="space-y-4">
          <div>
            <label className="label">Porcentaje de cashback (%)</label>
            <input type="number" min={0.01} max={99.99} step={0.01} className="input" value={meta.cashback_percentage as number ?? 5}
              onChange={e => set('cashback_percentage', parseFloat(e.target.value) || 5)} />
          </div>
          <div>
            <label className="label">Compra mínima ($)</label>
            <input type="number" min={0} step={0.01} className="input" value={meta.minimum_purchase as number ?? 0}
              onChange={e => set('minimum_purchase', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Días de expiración del crédito</label>
            <input type="number" min={1} className="input" value={meta.credit_expiry_days as number ?? 365}
              onChange={e => set('credit_expiry_days', parseInt(e.target.value) || 365)} />
          </div>
        </div>
      );
    case 'coupon':
      return (
        <div className="space-y-5">
          {/* Discount Type Selection — CPN-001/002 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="label mb-0">Tipo de descuento</label>
              <Tooltip text="Crea un cupón para ofrecer beneficios directos a tus clientes. Elige el tipo de descuento que mejor se adapte a tu estrategia." />
            </div>
            <div className="grid grid-cols-1 gap-2">
              {[
                { value: 'fixed_amount', label: 'Descuento de valor fijo', tooltip: 'Define un monto fijo que se descontará del total de la compra del cliente.' },
                { value: 'percentage', label: 'Descuento porcentual', tooltip: 'Aplica un porcentaje de descuento sobre el total de la compra del cliente.' },
                { value: 'special_promotion', label: 'Promoción especial', tooltip: 'Escribe el beneficio exacto que recibirá el cliente, como 2x1 o producto gratis.' },
              ].map(opt => (
                <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  meta.discount_type === opt.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                }`}>
                  <input
                    type="radio"
                    name="discount_type"
                    value={opt.value}
                    checked={meta.discount_type === opt.value}
                    onChange={() => set('discount_type', opt.value)}
                    className="accent-brand-500"
                  />
                  <span className="font-medium text-sm text-surface-900 dark:text-white">{opt.label}</span>
                  <Tooltip text={opt.tooltip} />
                </label>
              ))}
            </div>
          </div>

          {/* Dynamic Fields Based on Type — CPN-003/004/005 */}
          {meta.discount_type === 'fixed_amount' && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="label mb-0">Monto del descuento</label>
                <Tooltip text="Ingresa el valor en dólares que deseas descontar." />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 font-bold">$</span>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  className="input pl-8"
                  placeholder="5.00"
                  value={meta.discount_value as number ?? ''}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0) set('discount_value', val);
                    else if (e.target.value === '') set('discount_value', '');
                  }}
                  required
                />
              </div>
            </div>
          )}

          {meta.discount_type === 'percentage' && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="label mb-0">Porcentaje de descuento</label>
                <Tooltip text="Ingresa el porcentaje de descuento (entre 1 y 100)." />
              </div>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={0.01}
                  className="input pr-8"
                  placeholder="15"
                  value={meta.discount_value as number ?? ''}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0 && val <= 100) set('discount_value', val);
                    else if (e.target.value === '') set('discount_value', '');
                  }}
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 font-bold">%</span>
              </div>
            </div>
          )}

          {meta.discount_type === 'special_promotion' && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="label mb-0">Descripción de la promoción</label>
                <Tooltip text="Describe la promoción tal como la verá el cliente." />
              </div>
              <input
                type="text"
                className="input"
                placeholder="Ej: 2x1 en cervezas artesanales"
                maxLength={100}
                value={meta.special_promotion_text as string ?? ''}
                onChange={e => set('special_promotion_text', e.target.value)}
                required
              />
              <p className="text-xs text-surface-400 mt-1 text-right">
                {(meta.special_promotion_text as string ?? '').length}/100 caracteres
              </p>
            </div>
          )}

          {/* Help Section — CPN-014 */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-brand-500 hover:text-brand-600 flex items-center gap-1">
              <svg className="w-4 h-4 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              ¿Cuál es la diferencia entre monto fijo y porcentual?
            </summary>
            <div className="mt-2 p-4 bg-surface-50 dark:bg-surface-800 rounded-xl text-xs text-surface-600 dark:text-surface-300 space-y-2">
              <p><strong className="text-surface-900 dark:text-white">Monto fijo:</strong> El valor que especifiques será el valor monetario exacto que obsequiarás a tu cliente. Ejemplo: si pones $5, el cliente recibirá $5 de descuento directo.</p>
              <p><strong className="text-surface-900 dark:text-white">Porcentual:</strong> El descuento será calculado a partir del consumo que tenga el cliente. Ejemplo: si pones 15%, y el cliente consume $40, recibirá $6 de descuento.</p>
              <p><strong className="text-surface-900 dark:text-white">Promoción especial:</strong> Texto libre para promociones como &quot;2x1&quot;, &quot;Postre gratis&quot;, o &quot;Bebida de cortesía&quot;.</p>
            </div>
          </details>

          {/* Dates — DATE-001 thru DATE-005 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="label mb-0">Vigencia del cupón</label>
              <Tooltip text="Define desde cuándo y hasta cuándo el cupón estará disponible para los clientes." />
            </div>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                meta.coupon_expiry === 'unlimited' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-surface-200 dark:border-surface-700'
              }`}>
                <input type="radio" name="coupon_expiry" value="unlimited" checked={meta.coupon_expiry === 'unlimited' || !meta.coupon_expiry}
                  onChange={() => set('coupon_expiry', 'unlimited')} className="accent-brand-500" />
                <span className="text-sm text-surface-900 dark:text-white font-medium">Ilimitado (no vence)</span>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                meta.coupon_expiry === 'dates' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-surface-200 dark:border-surface-700'
              }`}>
                <input type="radio" name="coupon_expiry" value="dates" checked={meta.coupon_expiry === 'dates'}
                  onChange={() => set('coupon_expiry', 'dates')} className="accent-brand-500" />
                <span className="text-sm text-surface-900 dark:text-white font-medium">Fechas específicas</span>
              </label>
            </div>
            {meta.coupon_expiry === 'dates' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="label">Fecha de inicio</label>
                  <input type="date" className="input" value={meta.coupon_start_date as string ?? ''} required
                    onChange={e => set('coupon_start_date', e.target.value)} />
                </div>
                <div>
                  <label className="label">Fecha de fin</label>
                  <input type="date" className="input" value={meta.coupon_end_date as string ?? ''} required
                    min={meta.coupon_start_date as string ?? ''}
                    onChange={e => set('coupon_end_date', e.target.value)} />
                  {Boolean(meta.coupon_end_date && meta.coupon_start_date && (meta.coupon_end_date as string) < (meta.coupon_start_date as string)) && (
                    <p className="text-xs text-red-500 mt-1">⚠️ La fecha de fin no puede ser anterior a la fecha de inicio</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Uses per customer */}
          <div>
            <label className="label">Usos máximos por cliente</label>
            <input type="number" min={1} className="input" value={meta.usage_limit_per_customer as number ?? 1}
              onChange={e => set('usage_limit_per_customer', parseInt(e.target.value) || 1)} />
          </div>

          {/* Coupon Description */}
          <div>
            <label className="label">Descripción del cupón</label>
            <input type="text" className="input" value={meta.coupon_description as string ?? ''}
              onChange={e => set('coupon_description', e.target.value)} />
          </div>
          {/* Coupon Image — CPN-IMG */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="label mb-0">Imagen del cupón (URL)</label>
              <Tooltip text="Sube o pega la URL de una imagen que represente el cupón. Se mostrará en la tarjeta de wallet del cliente." />
            </div>
            <input type="url" className="input" placeholder="https://example.com/coupon-image.jpg" value={meta.coupon_image_url as string ?? ''}
              onChange={e => set('coupon_image_url', e.target.value)} />
          </div>

          {/* Push Notification Module — CPNPUSH-001 thru CPNPUSH-011 */}
          <div className="border-t border-surface-200 dark:border-surface-700 pt-5 mt-5">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-surface-900 dark:text-white">Notificación automática al guardar el cupón</h3>
              <Tooltip text="Define el título y mensaje que recibirá el cliente cuando guarde este cupón en su wallet." />
            </div>
            <p className="text-xs text-surface-500 mb-3">
              Permite definir un mensaje de notificación push que el cliente recibirá automáticamente cuando agregue o descargue el cupón en su wallet.
            </p>
            {/* Push Title — CPNPUSH-TITLE */}
            <div className="mb-3">
              <label className="label">Título de la notificación</label>
              <input type="text" className="input" placeholder="¡Tu cupón está listo!" maxLength={60}
                value={meta.push_title as string ?? ''}
                onChange={e => set('push_title', e.target.value)} />
              <span className="text-[10px] text-surface-400 mt-0.5 block">{(meta.push_title as string ?? '').length}/60</span>
            </div>
            <div className="relative">
              <textarea
                className="input min-h-[80px] resize-none"
                placeholder="Tu cupón ya está activo. Disfruta $5 de descuento en tu próxima compra 🍕"
                maxLength={178}
                value={meta.push_message as string ?? ''}
                onChange={e => set('push_message', e.target.value)}
              />
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1">
                  <Tooltip text="Este mensaje se enviará automáticamente una sola vez cuando el cliente active el cupón." />
                  <span className="text-[10px] text-surface-400">Este campo es opcional</span>
                </div>
                <span className={`text-xs font-mono ${
                  (meta.push_message as string ?? '').length > 160 ? 'text-amber-500' : 'text-surface-400'
                }`}>
                  {(meta.push_message as string ?? '').length}/178
                </span>
              </div>
            </div>
            {/* Expiry Reminder — CPNPUSH-EXPIRY */}
            <div className="mt-4 flex items-center gap-3">
              <input type="checkbox" id="push_expiry_reminder" className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
                checked={!!meta.push_expiry_reminder}
                onChange={e => set('push_expiry_reminder', e.target.checked)} />
              <label htmlFor="push_expiry_reminder" className="text-sm text-surface-700 dark:text-surface-300">
                Enviar recordatorio push antes de que expire el cupón
              </label>
              <Tooltip text="Se enviará un push de recordatorio 24 horas antes de que el cupón expire." />
            </div>
          </div>
        </div>
      );

    case 'discount':
      return (
        <div className="space-y-4">
          <label className="label">Niveles de descuento (hasta 5)</label>
          {(meta.tiers as Array<{tier_name: string; threshold: number; discount_percentage: number}> ?? []).map((tier, i) => (
            <div key={i} className="flex gap-2">
              <input type="text" className="input flex-1" placeholder="Nombre del nivel" value={tier.tier_name}
                onChange={e => {
                  const tiers = [...(meta.tiers as Array<{tier_name: string; threshold: number; discount_percentage: number}>)];
                  tiers[i] = { ...tiers[i], tier_name: e.target.value };
                  set('tiers', tiers);
                }} />
              <input type="number" className="input w-28" placeholder="Mín $" value={tier.threshold}
                onChange={e => {
                  const tiers = [...(meta.tiers as Array<{tier_name: string; threshold: number; discount_percentage: number}>)];
                  tiers[i] = { ...tiers[i], threshold: parseFloat(e.target.value) || 0 };
                  set('tiers', tiers);
                }} />
              <input type="number" className="input w-20" placeholder="%" value={tier.discount_percentage}
                onChange={e => {
                  const tiers = [...(meta.tiers as Array<{tier_name: string; threshold: number; discount_percentage: number}>)];
                  tiers[i] = { ...tiers[i], discount_percentage: parseFloat(e.target.value) || 0 };
                  set('tiers', tiers);
                }} />
              <button type="button" className="btn-ghost text-red-500 px-2" onClick={() => {
                const tiers = [...(meta.tiers as Array<unknown>)];
                tiers.splice(i, 1);
                set('tiers', tiers);
              }}>✕</button>
            </div>
          ))}
          {(meta.tiers as Array<unknown> ?? []).length < 5 && (
            <button type="button" className="btn-secondary text-xs" onClick={() => {
              const tiers = [...(meta.tiers as Array<unknown> ?? []), { tier_name: '', threshold: 0, discount_percentage: 0 }];
              set('tiers', tiers);
            }}>+ Agregar nivel</button>
          )}
        </div>
      );
    case 'gift_certificate':
      return (
        <div className="space-y-4">
          <div>
            <label className="label">Denominaciones disponibles ($)</label>
            <input type="text" className="input" placeholder="10, 25, 50, 100"
              value={(meta.denominations as number[])?.join(', ') ?? ''}
              onChange={e => set('denominations', e.target.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)))} />
            <p className="text-xs text-surface-400 mt-1 ml-1">Separa los montos con comas</p>
          </div>
          <div>
            <label className="label">Días de expiración</label>
            <input type="number" min={1} className="input" value={meta.expiry_days as number ?? 365}
              onChange={e => set('expiry_days', parseInt(e.target.value) || 365)} />
          </div>
        </div>
      );
    case 'vip_membership':
      return (
        <div className="space-y-4">
          <div>
            <label className="label">Nombre de la membresía</label>
            <input type="text" className="input" value={meta.membership_name as string ?? ''} placeholder="Ej: Club VIP Gold"
              onChange={e => set('membership_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cuota mensual ($)</label>
              <input type="number" min={0} step={0.01} className="input" value={meta.monthly_fee as number ?? 0}
                onChange={e => set('monthly_fee', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label">Cuota anual ($)</label>
              <input type="number" min={0} step={0.01} className="input" value={meta.annual_fee as number ?? 0}
                onChange={e => set('annual_fee', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <label className="label">Periodo de validez</label>
            <select className="input" value={meta.validity_period as string ?? 'monthly'}
              onChange={e => set('validity_period', e.target.value)}>
              <option value="monthly">Mensual</option>
              <option value="quarterly">Trimestral</option>
              <option value="annual">Anual</option>
              <option value="lifetime">Vitalicio</option>
            </select>
          </div>
        </div>
      );
    case 'referral_pass':
      return (
        <div className="space-y-4">
          <div>
            <label className="label">Recompensa para el que refiere</label>
            <input type="text" className="input" value={meta.referrer_reward as string ?? ''}
              onChange={e => set('referrer_reward', e.target.value)} placeholder="Ej: 10% de descuento" />
          </div>
          <div>
            <label className="label">Recompensa para el referido</label>
            <input type="text" className="input" value={meta.referee_reward as string ?? ''}
              onChange={e => set('referee_reward', e.target.value)} placeholder="Ej: 5% en primera compra" />
          </div>
          <div>
            <label className="label">Máximo de referidos por cliente</label>
            <input type="number" min={0} className="input" value={meta.max_referrals_per_customer as number ?? 10}
              onChange={e => set('max_referrals_per_customer', parseInt(e.target.value) || 10)} />
          </div>
        </div>
      );
    case 'multipass':
      return (
        <div className="space-y-4">
          <div>
            <label className="label">Cantidad de sellos en el paquete</label>
            <input type="number" min={1} className="input" value={meta.bundle_size as number ?? 10}
              onChange={e => set('bundle_size', parseInt(e.target.value) || 10)} />
          </div>
          <div>
            <label className="label">Precio del paquete ($)</label>
            <input type="number" min={0.01} step={0.01} className="input" value={meta.bundle_price as number ?? 25}
              onChange={e => set('bundle_price', parseFloat(e.target.value) || 25)} />
          </div>
        </div>
      );
    default:
      return (
        <div className="card p-8 text-center">
          <p className="text-surface-500">Este tipo de tarjeta no requiere configuración adicional.</p>
        </div>
      );
  }
}

export default TypeConfig;
