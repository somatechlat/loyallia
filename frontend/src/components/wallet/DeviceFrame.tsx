/**
 * Device frames for wallet pass previews.
 *
 * Real iPhone and Android shells with thin bezels, correct aspect ratios and a
 * subtle outer glow so the pass reads as a product shot. Stage width scales up
 * to {@link DEVICE_STAGE_MAX} and down responsively — never a fixed 260px.
 *
 * Colours come from Tailwind neutrals; depth comes from `design-system.ts`.
 */
import React from 'react';
import { useI18n } from '@/lib/i18n';
import { CARD_SHADOW, CARD_TYPE_SCALE } from './design-system';

/** Maximum card stage width in the studio. */
export const DEVICE_STAGE_MAX = 380;
/** Minimum practical stage width before type gets cramped. */
export const DEVICE_STAGE_MIN = 260;

/** Shared frame shell props. */
export interface DeviceFrameProps {
  /** Screen content (the pass card). */
  children: React.ReactNode;
  /** Draw the device chrome. When false, only the stage box is rendered. */
  chrome?: boolean;
  /** Optional outer frame width in CSS pixels. Omit to fill the parent stage. */
  width?: number;
}

function clampStage(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return DEVICE_STAGE_MAX;
  return Math.round(Math.max(DEVICE_STAGE_MIN, Math.min(width, DEVICE_STAGE_MAX)));
}

function stageStyle(width?: number): React.CSSProperties {
  if (typeof width === 'number') {
    return { width: clampStage(width), maxWidth: DEVICE_STAGE_MAX };
  }
  return { width: '100%', maxWidth: DEVICE_STAGE_MAX };
}

/** iPhone 15 Pro logical screen aspect (393 × 852). */
const IPHONE_ASPECT = '393 / 852';
/** Pixel-class Android screen aspect (20:9). */
const ANDROID_ASPECT = '1080 / 2400';
/** Apple Watch case aspect. */
const WATCH_ASPECT = '176 / 222';

function StatusBarIcons() {
  return (
    <div className="flex gap-1 items-center" aria-hidden>
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
      </svg>
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z" />
      </svg>
    </div>
  );
}

function StatusClock() {
  return (
    <span className={`${CARD_TYPE_SCALE.xs} font-medium tracking-wide text-zinc-400`}>
      9:41
    </span>
  );
}

/**
 * @description iPhone 15 Pro device frame for wallet previews.
 * @param {DeviceFrameProps} props - Frame props
 * @returns JSX.Element
 */
export function IPhone15ProFrame({ children, chrome = true, width }: DeviceFrameProps) {
  const { t } = useI18n();

  if (!chrome) {
    return (
      <div className="mx-auto" style={stageStyle(width)} data-testid="iphone-frame">
        {children}
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto"
      style={{ ...stageStyle(width), aspectRatio: IPHONE_ASPECT }}
      data-testid="iphone-frame"
      role="img"
      aria-label={t('wallet.preview.device.iphone')}
    >
      <div
        className={`absolute inset-0 overflow-hidden border border-zinc-500/70 ${CARD_SHADOW.lift}`}
        style={{
          borderRadius: '12%',
          background: 'linear-gradient(145deg, rgb(161 161 170), rgb(113 113 122), rgb(156 163 175))',
        }}
      >
        {/* Side buttons */}
        <div className="absolute -left-[3px] top-[14%] w-[3px] h-[6%] bg-zinc-600 rounded-l" aria-hidden />
        <div className="absolute -left-[3px] top-[21%] w-[3px] h-[8%] bg-zinc-600 rounded-l" aria-hidden />
        <div className="absolute -left-[3px] top-[30%] w-[3px] h-[8%] bg-zinc-600 rounded-l" aria-hidden />
        <div className="absolute -right-[3px] top-[22%] w-[3px] h-[11%] bg-zinc-600 rounded-r" aria-hidden />

        {/* Screen */}
        <div
          className="absolute overflow-hidden flex flex-col"
          style={{
            inset: '2.2%',
            borderRadius: '10.5%',
            background: 'linear-gradient(to bottom, rgb(24 24 27), rgb(9 9 11))',
          }}
        >
          <div
            className="absolute inset-0 z-30 pointer-events-none bg-gradient-to-b from-white/[0.06] to-transparent"
            aria-hidden
          />

          {/* Dynamic Island */}
          <div className="flex justify-center pt-[3%] pb-1 z-20 shrink-0">
            <div className="w-[22%] h-[2.6%] min-h-[18px] bg-black rounded-full border border-zinc-800 relative flex items-center justify-end">
              <div className="w-[22%] aspect-square rounded-full bg-zinc-950 border border-zinc-800 mr-[12%]" aria-hidden />
            </div>
          </div>

          {/* Status bar */}
          <div className="px-[5%] flex justify-between items-center z-10 shrink-0">
            <StatusClock />
            <StatusBarIcons />
          </div>

          {/* Wallet header label */}
          <div className="px-[4%] pt-[3%] pb-1 z-10 shrink-0">
            <p className={`${CARD_TYPE_SCALE.xs} font-semibold tracking-widest uppercase text-zinc-400`}>
              {t('wallet.preview.wallet')}
            </p>
          </div>

          {/* Content (pass card) */}
          <div className="flex-1 px-[3%] pt-1 pb-2 overflow-hidden min-h-0">
            {children}
          </div>

          {/* Home indicator */}
          <div className="flex justify-center pb-[3%] pt-1 shrink-0 z-10">
            <div className="w-1/3 h-[3px] bg-zinc-300 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @description Android (Pixel-class) device frame for Google Wallet previews.
 * @param {DeviceFrameProps} props - Frame props
 * @returns JSX.Element
 */
export function AndroidFrame({ children, chrome = true, width }: DeviceFrameProps) {
  const { t } = useI18n();

  if (!chrome) {
    return (
      <div className="mx-auto" style={stageStyle(width)} data-testid="android-frame">
        {children}
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto"
      style={{ ...stageStyle(width), aspectRatio: ANDROID_ASPECT }}
      data-testid="android-frame"
      role="img"
      aria-label={t('wallet.preview.device.android')}
    >
      <div
        className={`absolute inset-0 overflow-hidden border border-zinc-700 ${CARD_SHADOW.lift}`}
        style={{
          borderRadius: '11%',
          background: 'linear-gradient(145deg, rgb(63 63 70), rgb(24 24 27), rgb(82 82 91))',
        }}
      >
        {/* Side buttons */}
        <div className="absolute -left-[3px] top-[16%] w-[3px] h-[8%] bg-zinc-600 rounded-l" aria-hidden />
        <div className="absolute -left-[3px] top-[26%] w-[3px] h-[8%] bg-zinc-600 rounded-l" aria-hidden />
        <div className="absolute -right-[3px] top-[22%] w-[3px] h-[11%] bg-zinc-600 rounded-r" aria-hidden />

        {/* Screen */}
        <div
          className="absolute overflow-hidden flex flex-col bg-black"
          style={{ inset: '2%', borderRadius: '9.5%' }}
        >
          {/* Punch-hole camera */}
          <div className="flex justify-center pt-[3%] pb-1 z-20 shrink-0">
            <div
              className="w-[3.5%] aspect-square rounded-full bg-zinc-950 border border-zinc-800 shadow-inner"
              aria-hidden
            />
          </div>

          {/* Status bar */}
          <div className="px-[4%] flex justify-between items-center z-10 shrink-0">
            <StatusClock />
            <StatusBarIcons />
          </div>

          {/* Google Wallet header */}
          <div className="px-[3.5%] py-1.5 flex items-center gap-1.5 z-10 shrink-0">
            <svg className="w-4 h-4 text-zinc-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
            </svg>
            <span className={`${CARD_TYPE_SCALE.xs} text-zinc-300 font-medium`}>
              {t('wallet.preview.googleWallet')}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 px-[2.5%] pt-1 pb-2 overflow-hidden min-h-0">
            {children}
          </div>

          {/* Gesture nav pill */}
          <div className="flex justify-center pb-[3%] pt-1 shrink-0 z-10">
            <div className="w-1/3 h-[3px] bg-zinc-200 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @description Pixel 7 alias kept for existing Google preview imports.
 */
export function Pixel7Frame(props: DeviceFrameProps) {
  return <AndroidFrame {...props} />;
}

/**
 * @description Apple Watch frame for Pass Designer-style dual previews.
 * @param {DeviceFrameProps} props - Frame props
 * @returns JSX.Element
 */
export function AppleWatchFrame({ children, chrome = true, width }: DeviceFrameProps) {
  const watchStyle: React.CSSProperties = {
    width: typeof width === 'number' ? clampStage(Math.min(width, 200)) : '100%',
    maxWidth: 200,
  };

  if (!chrome) {
    return (
      <div className="mx-auto" style={watchStyle} data-testid="apple-watch-frame">
        {children}
      </div>
    );
  }

  return (
    <div className="relative mx-auto" style={watchStyle} data-testid="apple-watch-frame">
      {/* Band */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-4 w-[38%] h-[18%] rounded-t-[18px] bg-zinc-800 border border-zinc-700" aria-hidden />
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-[38%] h-[18%] rounded-b-[18px] bg-zinc-800 border border-zinc-700" aria-hidden />
      {/* Case */}
      <div
        className={`relative overflow-hidden border-2 border-zinc-500 ${CARD_SHADOW.card}`}
        style={{
          aspectRatio: WATCH_ASPECT,
          borderRadius: '28%',
          background: 'linear-gradient(145deg, rgb(63 63 70), rgb(24 24 27))',
        }}
      >
        {/* Digital crown */}
        <div className="absolute -right-[4px] top-[18%] w-[4px] h-[16%] bg-zinc-400 rounded-r" aria-hidden />
        <div className="absolute -right-[3px] top-[38%] w-[3px] h-[12%] bg-zinc-500 rounded-r" aria-hidden />
        {/* Screen */}
        <div
          className="absolute overflow-hidden bg-black flex flex-col"
          style={{ inset: '5%', borderRadius: '22%' }}
        >
          <div className="px-2.5 pt-2.5 pb-1 flex items-center justify-between shrink-0">
            <span className={`${CARD_TYPE_SCALE.xs} text-zinc-300 font-medium`}>9:41</span>
            <div className="flex items-center gap-0.5 text-zinc-300" aria-hidden>
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9z" />
              </svg>
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z" />
              </svg>
            </div>
          </div>
          <div className="flex-1 overflow-hidden px-1.5 pb-1.5 min-h-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @description Side-by-side iPhone + Apple Watch preview (Pass Designer parity).
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.iphone - iPhone pass content
 * @param {React.ReactNode} props.watch - Apple Watch pass content
 * @param {boolean} [props.showWatch=true] - Toggle watch preview
 * @param {number} [props.width] - iPhone stage width
 * @returns JSX.Element
 */
export function DualDevicePreview({
  iphone,
  watch,
  showWatch = true,
  width,
}: {
  iphone: React.ReactNode;
  watch?: React.ReactNode;
  showWatch?: boolean;
  width?: number;
}) {
  return (
    <div className="flex items-start justify-center gap-5" data-testid="dual-device-preview">
      <IPhone15ProFrame width={width}>{iphone}</IPhone15ProFrame>
      {showWatch && watch ? <AppleWatchFrame>{watch}</AppleWatchFrame> : null}
    </div>
  );
}
