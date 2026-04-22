import { CardTypeIcon, CARD_TYPES, DESIGN_TEMPLATES, adjustColor } from './constants';

/* ─── Wallet Card Preview ─────────────────────────────────────────── */
export default function WalletCardPreview({ form, selectedType, logoPreview, stripPreview }: {
  form: { name: string; description: string; background_color: string; text_color: string; card_type: string; strip_image_url?: string };
  selectedType: typeof CARD_TYPES[0] | undefined;
  logoPreview: string | null;
  stripPreview?: string | null;
}) {
  // Get template colors for gradient
  const template = DESIGN_TEMPLATES.find(t => t.id === 'midnight') || DESIGN_TEMPLATES[0];
  const bgColor = form.background_color || template.bg;
  const textColor = form.text_color || template.text;
  const accentColor = template.accent;
  const heroImage = stripPreview || form.strip_image_url;
  
  // Create gradient background based on template
  const gradientStyle = {
    background: bgColor.startsWith('#') && bgColor.length === 7 
      ? `linear-gradient(135deg, ${bgColor} 0%, ${adjustColor(bgColor, -20)} 50%, ${bgColor} 100%)`
      : bgColor,
  };

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Phone frame - iPhone style */}
      <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl border-4 border-gray-800">
        <div className="bg-gray-900 rounded-[2.5rem] overflow-hidden relative">
          {/* Dynamic Island / Status bar */}
          <div className="bg-black/80 px-6 py-3 flex items-center justify-between">
            <div className="w-16 h-2 bg-gray-700 rounded-full mx-auto" />
          </div>
          
          {/* Wallet card - Full beautiful design */}
          <div className="px-4 pb-6 pt-2">
            <div
              className="rounded-3xl p-5 min-h-[240px] flex flex-col justify-between shadow-2xl relative overflow-hidden"
              style={{ 
                background: gradientStyle.background,
                color: textColor,
                boxShadow: `0 20px 40px -10px ${bgColor}80, 0 0 0 1px ${textColor}10`
              }}
            >
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 opacity-20" style={{
                background: `linear-gradient(135deg, transparent 0%, ${accentColor}40 50%, transparent 100%)`,
              }} />
              
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, ${textColor} 1px, transparent 1px)`,
                backgroundSize: '20px 20px'
              }} />

              {/* ==================== HERO IMAGE (if uploaded) ==================== */}
              {heroImage && (
                <div className="relative z-10 -mx-5 -mt-5 mb-3">
                  <img 
                    src={heroImage} 
                    alt="Hero" 
                    className="w-full h-16 object-cover rounded-t-3xl"
                  />
                </div>
              )}

              {/* ==================== TOP SECTION ==================== */}
              <div className="relative z-10" style={{ marginTop: heroImage ? '0' : '0' }}>
                {/* Logo + Brand Section - PROMINENTLY DISPLAYED */}
                <div className="flex items-center gap-3 mb-4">
                  {logoPreview ? (
                    <div className="relative">
                      <img 
                        src={logoPreview} 
                        alt="Logo" 
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-white/30 shadow-lg"
                        style={{ boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}
                      />
                      {/* Glow effect behind logo */}
                      <div className="absolute inset-0 rounded-2xl bg-white/20 blur-xl" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
                      <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-7 h-7" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-50 mb-0.5">
                      {selectedType?.label || 'Programa de Fidelidad'}
                    </p>
                    <p className="text-lg font-bold leading-tight truncate drop-shadow-md">
                      {form.name || 'Nombre del Programa'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ==================== MIDDLE SECTION ==================== */}
              <div className="relative z-10 my-2">
                <p className="text-xs leading-relaxed opacity-70 line-clamp-2 drop-shadow-sm">
                  {form.description || 'Descripción de tu programa de fidelización'}
                </p>
              </div>

              {/* ==================== BOTTOM SECTION ==================== */}
              <div className="relative z-10 mt-2">
                <div className="flex items-end justify-between">
                  {/* Customer info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-semibold uppercase tracking-wider opacity-40">Cliente</p>
                    <p className="text-sm font-bold opacity-90 truncate drop-shadow-md">Juan Pérez</p>
                    <p className="text-[10px] opacity-50 mt-0.5">Miembro desde 2024</p>
                  </div>
                  
                  {/* QR Code area - Premium design */}
                  <div className="bg-white/95 backdrop-blur-sm rounded-xl p-1.5 shadow-lg">
                    <div 
                      className="w-16 h-16 rounded-lg flex items-center justify-center"
                      style={{ 
                        background: `repeating-linear-gradient(0deg, #000 0px, #000 2px, transparent 2px, transparent 4px), repeating-linear-gradient(90deg, #000 0px, #000 2px, transparent 2px, transparent 4px)`,
                        backgroundSize: '4px 4px'
                      }}
                    >
                      <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-800">
                          <rect x="3" y="3" width="7" height="7" fill="#000"/>
                          <rect x="14" y="3" width="7" height="7" fill="#000"/>
                          <rect x="3" y="14" width="7" height="7" fill="#000"/>
                          <rect x="14" y="14" width="3" height="3" fill="#000"/>
                          <rect x="18" y="14" width="3" height="3" fill="#000"/>
                          <rect x="14" y="18" width="3" height="3" fill="#000"/>
                          <rect x="18" y="18" width="3" height="3" fill="#000"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card footer with subtle accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-1" style={{
                background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`
              }} />
            </div>
          </div>
          
          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-gray-600 rounded-full" />
        </div>
      </div>
      
      {/* Label */}
      <p className="text-center text-xs text-surface-400 mt-4 font-medium">
        Vista previa en Apple Wallet / Google Wallet
      </p>
    </div>
  );
}
