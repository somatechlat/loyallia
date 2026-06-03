'use client';

import { QRCodeSVG } from 'qrcode.react';
import { adjustColor } from '@/components/programs/constants';

/**
 * Represents a loyalty card for enrollment.
 */
interface Card {
  id: string; name: string; description: string; card_type: string; tenant_name: string;
  background_color: string; text_color: string; logo_url: string; strip_image_url: string;
  metadata: Record<string, unknown>;
}

/**
 * Result data after a successful enrollment.
 */
interface EnrollResult {
  id: string;
  card_name: string;
  card_type: string;
  qr_code: string;
  wallet_urls: {
    apple: string;
    google: string;
    status: string;
  };
  already_enrolled?: boolean;
}

/**
 * Props for the EnrollmentHero component.
 */
interface EnrollmentHeroProps {
  /** Card data for the program */
  card: Card;
  /** Enrollment result data */
  enrollResult: EnrollResult;
  /** Current form values (used for member name display) */
  form: Record<string, string>;
}

/**
 * @description Renders the card type icon for the enrollment hero.
 * @param {Object} props - Component props
 * @param {string} props.cardType - Type of loyalty card
 * @param {string} [props.className] - Additional CSS classes
 * @returns JSX.Element
 */
function IconCardType({ cardType, className = 'w-6 h-6' }: { cardType: string; className?: string }) {
  switch (cardType) {
    case 'stamp':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12h6" /><path d="M12 9v6" />
        </svg>
      );
    case 'cashback':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" />
        </svg>
      );
    case 'vip_membership':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z" /><path d="M3 20h18" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
        </svg>
      );
  }
}

/**
 * @description Hero card preview shown after successful enrollment with QR code.
 * @param {EnrollmentHeroProps} props - Component props
 * @returns JSX.Element
 */
export default function EnrollmentHero({ card, enrollResult, form }: EnrollmentHeroProps) {
  const bgColor = card.background_color || '#1A1A2E';
  const txtColor = card.text_color || '#FFFFFF';

  return (
    <div
      className="w-full rounded-2xl overflow-hidden shadow-xl relative"
      style={{ 
        background: `linear-gradient(135deg, ${bgColor} 0%, ${adjustColor(bgColor, -20)} 100%)`,
        color: txtColor
      }}
    >
      {/* Card gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      
      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, ${txtColor} 1px, transparent 1px)`,
        backgroundSize: '16px 16px'
      }} />

      <div className="relative p-5">
        {/* Card Header - Logo + Brand */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* Logo - PROMINENTLY DISPLAYED */}
            {card.logo_url ? (
              <img 
                src={card.logo_url} 
                alt="Logo" 
                className="w-12 h-12 rounded-xl object-cover border-2 border-white/30 shadow-lg"
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center border-2 border-white/30 shadow-lg"
                style={{ backgroundColor: txtColor + '20' }}
              >
                <IconCardType cardType={card.card_type} className="w-6 h-6" />
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-60 mb-0.5">Programa de lealtad</p>
              <h3 className="text-base font-bold leading-tight">{card.name}</h3>
              <p className="text-xs opacity-50 mt-0.5">{card.tenant_name}</p>
            </div>
          </div>
        </div>

        {/* Divider line */}
        <div className="h-px bg-current opacity-10 mb-4" />

        {/* Member info */}
        <div className="flex items-end justify-between">
          <div className="space-y-1.5">
            <div>
              <p className="text-[9px] uppercase tracking-widest opacity-40">Miembro</p>
              <p className="text-sm font-semibold">{form.first_name} {form.last_name}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest opacity-40">Código</p>
              <p className="text-xs font-mono tracking-wider opacity-80">{enrollResult.qr_code}</p>
            </div>
          </div>

          {/* QR Code — Real rendered SVG */}
          <div className="bg-white dark:bg-surface-900 rounded-lg p-2 shadow-inner">
            <QRCodeSVG
              value={enrollResult.qr_code}
              size={72}
              bgColor="#ffffff"
              fgColor="#111111"
              level="M"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
