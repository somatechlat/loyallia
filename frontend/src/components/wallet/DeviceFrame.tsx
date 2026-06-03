/**
 * @description iPhone 15 Pro device frame for wallet previews.
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render inside the frame
 * @returns JSX.Element
 */
export function IPhone15ProFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ width: 260, height: 562 }}>
      {/* Outer bezel with titanium gradient */}
      <div
        className="absolute inset-0 rounded-[48px] shadow-2xl border-2 border-neutral-500 overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #a1a1a1, #7a7a7a, #9a9a9a)' }}
      >
        {/* Side buttons */}
        <div className="absolute -left-[3px] top-[14%] w-[3px] h-7 bg-neutral-600 rounded-l" />
        <div className="absolute -left-[3px] top-[20%] w-[3px] h-10 bg-neutral-600 rounded-l" />
        <div className="absolute -left-[3px] top-[28%] w-[3px] h-10 bg-neutral-600 rounded-l" />
        <div className="absolute -right-[3px] top-[20%] w-[3px] h-16 bg-neutral-600 rounded-r" />

        {/* Screen */}
        <div className="absolute inset-[3px] rounded-[44px] overflow-hidden flex flex-col" style={{ background: 'linear-gradient(to bottom, #0f0f0f, #1a1a1a)' }}>
          {/* Dynamic Island */}
          <div className="flex justify-center pt-3 pb-1 z-20 shrink-0">
            <div
              className="bg-black rounded-full border border-neutral-800 relative flex items-center justify-end"
              style={{ width: 80, height: 24 }}
            >
              <div
                className="rounded-full bg-neutral-950 border border-neutral-800"
                style={{ width: 7, height: 7, marginRight: 10 }}
              />
            </div>
          </div>

          {/* Status bar */}
          <div className="px-5 flex justify-between items-center text-white text-opacity-40 z-10 shrink-0">
            <span className="text-[9px] font-medium tracking-wide">9:41</span>
            <div className="flex gap-1 items-center">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
            </div>
          </div>

          {/* Wallet header label */}
          <div className="px-4 pt-3 pb-1 z-10 shrink-0">
            <p className="text-[9px] text-white text-opacity-25 font-semibold tracking-widest uppercase">Wallet</p>
          </div>

          {/* Content (pass card) */}
          <div className="flex-1 px-3 pt-1 pb-2 overflow-hidden min-h-0">
            {children}
          </div>

          {/* Home indicator */}
          <div className="flex justify-center pb-3 pt-1 shrink-0 z-10">
            <div className="w-24 h-[3px] bg-white rounded-full opacity-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @description Google Pixel 7 device frame for wallet previews.
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render inside the frame
 * @returns JSX.Element
 */
export function Pixel7Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ width: 260, height: 540 }}>
      {/* Outer bezel */}
      <div className="absolute inset-0 rounded-[44px] shadow-2xl border-2 border-neutral-800 bg-neutral-900 overflow-hidden">
        {/* Side buttons */}
        <div className="absolute -left-[3px] top-[14%] w-[3px] h-10 bg-neutral-700 rounded-l" />
        <div className="absolute -left-[3px] top-[24%] w-[3px] h-10 bg-neutral-700 rounded-l" />
        <div className="absolute -right-[3px] top-[20%] w-[3px] h-14 bg-neutral-700 rounded-r" />

        {/* Screen */}
        <div className="absolute inset-[3px] rounded-[40px] overflow-hidden flex flex-col bg-black">
          {/* Camera bar */}
          <div className="flex justify-center pt-3 pb-1 z-20 shrink-0">
            <div className="bg-neutral-800 rounded-full flex items-center gap-2 px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-neutral-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-700" />
            </div>
          </div>

          {/* Status bar */}
          <div className="px-4 flex justify-between items-center text-white text-opacity-40 z-10 shrink-0">
            <span className="text-[9px] font-medium tracking-wide">9:41</span>
            <div className="flex gap-1 items-center">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
            </div>
          </div>

          {/* Google Wallet header */}
          <div className="px-3.5 py-1.5 flex items-center gap-1.5 z-10 shrink-0">
            <svg className="w-4 h-4 text-white opacity-30" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
            <span className="text-[10px] text-white opacity-30 font-medium">Google Wallet</span>
          </div>

          {/* Content */}
          <div className="flex-1 px-2.5 pt-1 pb-2 overflow-hidden min-h-0">
            {children}
          </div>

          {/* Nav pill */}
          <div className="flex justify-center pb-3 pt-1 shrink-0 z-10">
            <div className="w-28 h-[3px] bg-white rounded-full opacity-15" />
          </div>
        </div>
      </div>
    </div>
  );
}
