/**
 * Stamp motif artwork.
 *
 * Curated geometric glyphs for loyalty-card stamps. Every path is designed in
 * a 24×24 viewBox and painted with `currentColor` so a motif inherits
 * `palette.accent` (filled) or `palette.accentSoft` (empty) without any raw
 * colour in this file.
 *
 * `filled` paths are solid silhouettes. `outline` paths are matched pairs —
 * the same silhouette reduced to a consistent 2px outline for empty slots.
 */

export interface MotifArtwork {
  /** Solid silhouette path(s) for filled slots. */
  filled: string[];
  /** Outline path(s) for empty slots (matched silhouette). */
  outline: string[];
}

/** Shared outline ring used by empty slots of simple round motifs. */
const EMPTY_RING = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z';

/* ------------------------------------------------------------------ */
/*  Food & drink                                                      */
/* ------------------------------------------------------------------ */

const COFFEE: MotifArtwork = {
  filled: [
    // cup
    'M5.5 8h11l-1.1 9.4A3.2 3.2 0 0 1 12.2 20h-2.4a3.2 3.2 0 0 1-3.2-2.6L5.5 8z',
    // handle
    'M17.2 9.2h1.6a2.6 2.6 0 0 1 0 5.2h-1.6v-2.1h1.6a.5.5 0 0 0 0-1h-1.6V9.2z',
    // steam
    'M8.4 2.4c.6.9.6 1.9 0 2.8l1.2.6c.7-1.1.7-2.2 0-3.2l-1.2-.2z',
    'M12 1.8c.6.9.6 1.9 0 2.8l1.2.6c.7-1.1.7-2.2 0-3.2l-1.2-.2z',
  ],
  outline: [
    'M5.5 8h11l-1.1 9.4A3.2 3.2 0 0 1 12.2 20h-2.4a3.2 3.2 0 0 1-3.2-2.6L5.5 8z',
    'M17.2 9.2h1.6a2.6 2.6 0 0 1 0 5.2h-1.6',
    'M8.4 2.4c.6.9.6 1.9 0 2.8',
    'M12 1.8c.6.9.6 1.9 0 2.8',
  ],
};

const CROISSANT: MotifArtwork = {
  filled: [
    'M3.2 13.2c0-4.6 3.6-8.4 8.2-8.4 2.6 0 5 1.2 6.6 3.2l-2.3 1.8a5.5 5.5 0 0 0-4.3-2c-3.2 0-5.8 2.6-5.8 5.8 0 1.2.4 2.4 1 3.3l-3.4-3.7z',
    'M19.8 7.6l2.2-1.6c.6 1.2.8 2.5.6 3.8l-2.4-.6c.1-.5.1-1-.4-1.6z',
    'M17 16.8c-1 1.3-2.5 2.1-4.2 2.1l.6 2.5c2.5 0 4.8-1.2 6.2-3.2l-2.6-1.4z',
  ],
  outline: [
    'M3.2 13.2c0-4.6 3.6-8.4 8.2-8.4 2.6 0 5 1.2 6.6 3.2l-2.3 1.8a5.5 5.5 0 0 0-4.3-2c-3.2 0-5.8 2.6-5.8 5.8 0 1.2.4 2.4 1 3.3l-3.4-3.7z',
    'M19.8 7.6l2.2-1.6c.6 1.2.8 2.5.6 3.8l-2.4-.6',
    'M17 16.8c-1 1.3-2.5 2.1-4.2 2.1l.6 2.5c2.5 0 4.8-1.2 6.2-3.2l-2.6-1.4z',
  ],
};

const COCKTAIL: MotifArtwork = {
  filled: [
    'M3.2 4h17.6L12 13.2v6.2h4.2v2.2H7.8v-2.2H12v-6.2L3.2 4z',
  ],
  outline: [
    'M3.2 4h17.6L12 13.2v6.2h4.2v2.2H7.8v-2.2H12v-6.2L3.2 4z',
  ],
};

const PIZZA: MotifArtwork = {
  filled: [
    'M12 2.2c.7 0 1.3.3 1.7.9l8.4 12.2c.8 1.1-.1 2.7-1.5 2.7H3.4c-1.4 0-2.3-1.6-1.5-2.7L10.3 3.1c.4-.6 1-.9 1.7-.9z',
    // pepperoni
    'M9.2 9.4a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z',
    'M14.6 8.2a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z',
    'M11.8 13.2a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z',
  ],
  outline: [
    'M12 2.2c.7 0 1.3.3 1.7.9l8.4 12.2c.8 1.1-.1 2.7-1.5 2.7H3.4c-1.4 0-2.3-1.6-1.5-2.7L10.3 3.1c.4-.6 1-.9 1.7-.9z',
    'M9.2 9.4a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z',
    'M14.6 8.2a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z',
    'M11.8 13.2a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z',
  ],
};

const BURGER: MotifArtwork = {
  filled: [
    // top bun
    'M3.2 11.2c0-4.2 3.9-7.4 8.8-7.4s8.8 3.2 8.8 7.4H3.2z',
    // patty
    'M2.6 13h18.8v2.2a1.8 1.8 0 0 1-1.8 1.8H4.4a1.8 1.8 0 0 1-1.8-1.8V13z',
    // bottom bun
    'M4.2 18.2h15.6a2.8 2.8 0 0 1-2.8 3.2H7a2.8 2.8 0 0 1-2.8-3.2z',
  ],
  outline: [
    'M3.2 11.2c0-4.2 3.9-7.4 8.8-7.4s8.8 3.2 8.8 7.4H3.2z',
    'M2.6 13h18.8v2.2a1.8 1.8 0 0 1-1.8 1.8H4.4a1.8 1.8 0 0 1-1.8-1.8V13z',
    'M4.2 18.2h15.6a2.8 2.8 0 0 1-2.8 3.2H7a2.8 2.8 0 0 1-2.8-3.2z',
  ],
};

const ICE_CREAM: MotifArtwork = {
  filled: [
    // cone
    'M8.2 12.6h7.6L12 22.2 8.2 12.6z',
    // scoops
    'M12 2.2c2.6 0 4.8 1.9 5.2 4.4H6.8C7.2 4.1 9.4 2.2 12 2.2z',
    'M5.4 8.2c.4-1.2 1.6-2 3-2h7.2c1.4 0 2.6.8 3 2H5.4z',
  ],
  outline: [
    'M8.2 12.6h7.6L12 22.2 8.2 12.6z',
    'M12 2.2c2.6 0 4.8 1.9 5.2 4.4H6.8C7.2 4.1 9.4 2.2 12 2.2z',
    'M5.4 8.2c.4-1.2 1.6-2 3-2h7.2c1.4 0 2.6.8 3 2H5.4z',
  ],
};

/* ------------------------------------------------------------------ */
/*  Retail                                                            */
/* ------------------------------------------------------------------ */

const SHOPPING_BAG: MotifArtwork = {
  filled: [
    'M5.2 8h13.6l1.2 12.2a1.8 1.8 0 0 1-1.8 2H5.8a1.8 1.8 0 0 1-1.8-2L5.2 8z',
    // handles
    'M8.2 8V6.2a3.8 3.8 0 0 1 7.6 0V8h-2.2V6.2a1.6 1.6 0 0 0-3.2 0V8H8.2z',
  ],
  outline: [
    'M5.2 8h13.6l1.2 12.2a1.8 1.8 0 0 1-1.8 2H5.8a1.8 1.8 0 0 1-1.8-2L5.2 8z',
    'M8.2 8V6.2a3.8 3.8 0 0 1 7.6 0V8',
  ],
};

const GIFT: MotifArtwork = {
  filled: [
    // box
    'M3.2 10.2h17.6V21a1 1 0 0 1-1 1H4.2a1 1 0 0 1-1-1v-10.8z',
    // lid
    'M2 6.4h20v3.4H2V6.4z',
    // ribbon vertical
    'M10.2 10.2h3.6V22h-3.6v-11.8z',
    // bows
    'M11.8 6.2c-1.4-2.4-5-2.4-5 0 0 1.6 2.8 2 5 0z',
    'M12.2 6.2c1.4-2.4 5-2.4 5 0 0 1.6-2.8 2-5 0z',
  ],
  outline: [
    'M3.2 10.2h17.6V21a1 1 0 0 1-1 1H4.2a1 1 0 0 1-1-1v-10.8z',
    'M2 6.4h20v3.4H2V6.4z',
    'M10.2 10.2h3.6V22h-3.6',
    'M11.8 6.2c-1.4-2.4-5-2.4-5 0 0 1.6 2.8 2 5 0z',
    'M12.2 6.2c1.4-2.4 5-2.4 5 0 0 1.6-2.8 2-5 0z',
  ],
};

const TAG: MotifArtwork = {
  filled: [
    'M3.2 4.2A1 1 0 0 1 4.2 3.2h7.4c.3 0 .5.1.7.3l8.8 8.8a1 1 0 0 1 0 1.4l-7.4 7.4a1 1 0 0 1-1.4 0L3.5 12.3a1 1 0 0 1-.3-.7V4.2z',
    'M8.2 8.2a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z',
  ],
  outline: [
    'M3.2 4.2A1 1 0 0 1 4.2 3.2h7.4c.3 0 .5.1.7.3l8.8 8.8a1 1 0 0 1 0 1.4l-7.4 7.4a1 1 0 0 1-1.4 0L3.5 12.3a1 1 0 0 1-.3-.7V4.2z',
    'M8.2 8.2a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z',
  ],
};

const CROWN: MotifArtwork = {
  filled: [
    'M3 8.2l3.6 3.4L12 4.2l5.4 7.4L21 8.2l-2 12.2H5L3 8.2z',
  ],
  outline: [
    'M3 8.2l3.6 3.4L12 4.2l5.4 7.4L21 8.2l-2 12.2H5L3 8.2z',
  ],
};

const STAR: MotifArtwork = {
  filled: [
    'M12 2.2l2.9 6.4 7 .7-5.2 4.8 1.5 6.9L12 17.4 5.8 21l1.5-6.9L2.1 9.3l7-.7L12 2.2z',
  ],
  outline: [
    'M12 2.2l2.9 6.4 7 .7-5.2 4.8 1.5 6.9L12 17.4 5.8 21l1.5-6.9L2.1 9.3l7-.7L12 2.2z',
  ],
};

const HEART: MotifArtwork = {
  filled: [
    'M12 21s-8.2-5-10.2-9.6C.4 8.2 2.2 4.6 5.8 4.6c2.1 0 3.8 1.1 4.7 2.7.9-1.6 2.6-2.7 4.7-2.7 3.6 0 5.4 3.6 4 6.8C20.2 16 12 21 12 21z',
  ],
  outline: [
    'M12 21s-8.2-5-10.2-9.6C.4 8.2 2.2 4.6 5.8 4.6c2.1 0 3.8 1.1 4.7 2.7.9-1.6 2.6-2.7 4.7-2.7 3.6 0 5.4 3.6 4 6.8C20.2 16 12 21 12 21z',
  ],
};

const DIAMOND: MotifArtwork = {
  filled: [
    'M7.2 2.2h9.6L22 9.2 12 22.2 2 9.2l5.2-7z',
    // facet sheen
    'M12 2.2L8.2 9.2h7.6L12 2.2z',
  ],
  outline: [
    'M7.2 2.2h9.6L22 9.2 12 22.2 2 9.2l5.2-7z',
    'M12 2.2L8.2 9.2h7.6L12 2.2z',
    'M2 9.2h20',
  ],
};

/* ------------------------------------------------------------------ */
/*  Services                                                          */
/* ------------------------------------------------------------------ */

const SCISSORS: MotifArtwork = {
  filled: [
    // blades
    'M9.4 14.6L4.2 21h2.6l4.4-5.4-1.8-1z',
    'M14.6 14.6L19.8 21h-2.6l-4.4-5.4 1.8-1z',
    'M9.4 9.4L4.2 3h2.6l4.4 5.4-1.8 1z',
    'M14.6 9.4L19.8 3h-2.6l-4.4 5.4 1.8 1z',
    // rings
    'M7.2 13.4a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6zm0 2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z',
    'M16.8 13.4a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6zm0 2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z',
  ],
  outline: [
    'M9.4 14.6L4.2 21h2.6l4.4-5.4',
    'M14.6 14.6L19.8 21h-2.6l-4.4-5.4',
    'M9.4 9.4L4.2 3h2.6l4.4 5.4',
    'M14.6 9.4L19.8 3h-2.6l-4.4 5.4',
    'M7.2 13.4a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6zm0 2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z',
    'M16.8 13.4a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6zm0 2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z',
  ],
};

const SPRAY: MotifArtwork = {
  filled: [
    // body
    'M8.2 9.2h7.6v11.4a1.6 1.6 0 0 1-1.6 1.6H9.8a1.6 1.6 0 0 1-1.6-1.6V9.2z',
    // neck
    'M10 5.4h4v3.8h-4V5.4z',
    // trigger head
    'M11.2 2.2h6.2a1.8 1.8 0 0 1 1.8 1.8v2.2h-4.2V4.6h-3.8V2.2z',
    // spray dots
    'M20.2 3.2a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z',
    'M21.6 6.2a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z',
    'M20.2 8.8a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z',
  ],
  outline: [
    'M8.2 9.2h7.6v11.4a1.6 1.6 0 0 1-1.6 1.6H9.8a1.6 1.6 0 0 1-1.6-1.6V9.2z',
    'M10 5.4h4v3.8h-4V5.4z',
    'M11.2 2.2h6.2a1.8 1.8 0 0 1 1.8 1.8v2.2h-4.2V4.6h-3.8V2.2z',
    'M20.2 3.2a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z',
    'M21.6 6.2a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z',
    'M20.2 8.8a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z',
  ],
};

const CAR: MotifArtwork = {
  filled: [
    // body
    'M4.2 11.2l1.6-4.2A2.6 2.6 0 0 1 8.2 5.4h7.6a2.6 2.6 0 0 1 2.4 1.6l1.6 4.2h1a1.8 1.8 0 0 1 1.8 1.8v4.2a1 1 0 0 1-1 1h-1.8v1.2a1.6 1.6 0 0 1-3.2 0v-1.2H8.4v1.2a1.6 1.6 0 0 1-3.2 0v-1.2H3.4a1 1 0 0 1-1-1V13a1.8 1.8 0 0 1 1.8-1.8h1z',
    // window
    'M6.8 10.2l1-2.4h8.4l1 2.4H6.8z',
  ],
  outline: [
    'M4.2 11.2l1.6-4.2A2.6 2.6 0 0 1 8.2 5.4h7.6a2.6 2.6 0 0 1 2.4 1.6l1.6 4.2h1a1.8 1.8 0 0 1 1.8 1.8v4.2a1 1 0 0 1-1 1h-1.8v1.2a1.6 1.6 0 0 1-3.2 0v-1.2H8.4v1.2a1.6 1.6 0 0 1-3.2 0v-1.2H3.4a1 1 0 0 1-1-1V13a1.8 1.8 0 0 1 1.8-1.8h1z',
    'M6.8 10.2l1-2.4h8.4l1 2.4H6.8z',
    'M6.2 14.2h1.6',
    'M16.2 14.2h1.6',
  ],
};

const BARBER: MotifArtwork = {
  filled: [
    // comb body
    'M3.2 5.4h11.2a1 1 0 0 1 1 1v3.2H3.2V5.4z',
    // comb teeth
    'M4.2 10.6h1.4v5.2H4.2zM7 10.6h1.4v5.2H7zM9.8 10.6h1.4v5.2H9.8zM12.6 10.6h1.4v5.2h-1.4z',
    // scissors
    'M16.8 8.2l4.4-4.4 1.4 1.4-4.4 4.4-1.4-1.4z',
    'M16.2 14.2a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm0 1.4a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z',
    'M19.4 11.6a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm0 1.4a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z',
    'M15.2 15.2l-2.4 4.6 1.2.7 2.4-4.6-1.2-.7z',
  ],
  outline: [
    'M3.2 5.4h11.2a1 1 0 0 1 1 1v3.2H3.2V5.4z',
    'M4.2 10.6h1.4v5.2H4.2zM7 10.6h1.4v5.2H7zM9.8 10.6h1.4v5.2H9.8zM12.6 10.6h1.4v5.2h-1.4z',
    'M16.8 8.2l4.4-4.4 1.4 1.4-4.4 4.4-1.4-1.4z',
    'M16.2 14.2a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm0 1.4a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z',
    'M19.4 11.6a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm0 1.4a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z',
    'M15.2 15.2l-2.4 4.6',
  ],
};

const PAW: MotifArtwork = {
  filled: [
    // main pad
    'M12 12.2c3 0 5.6 2.2 5.6 4.8 0 2-1.6 3.4-3.6 3.4h-4c-2 0-3.6-1.4-3.6-3.4 0-2.6 2.6-4.8 5.6-4.8z',
    // toes
    'M6.2 6.6a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2z',
    'M17.8 6.6a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2z',
    'M10 2.8a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2z',
    'M14 2.8a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2z',
  ],
  outline: [
    'M12 12.2c3 0 5.6 2.2 5.6 4.8 0 2-1.6 3.4-3.6 3.4h-4c-2 0-3.6-1.4-3.6-3.4 0-2.6 2.6-4.8 5.6-4.8z',
    'M6.2 6.6a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2z',
    'M17.8 6.6a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2z',
    'M10 2.8a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2z',
    'M14 2.8a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2z',
  ],
};

const LEAF: MotifArtwork = {
  filled: [
    'M20.8 3.2c-9 0-15.6 5.2-15.6 13 0 1.6.3 3 .9 4.2.4-8.2 5-13.2 11.4-15.2-5.2 3-8.6 8-9.4 15.2 1.1.5 2.4.8 3.8.8 7.4 0 10.9-6.4 10.9-14.6 0-1.2-.3-2.4-.8-3.4z',
  ],
  outline: [
    'M20.8 3.2c-9 0-15.6 5.2-15.6 13 0 1.6.3 3 .9 4.2.4-8.2 5-13.2 11.4-15.2-5.2 3-8.6 8-9.4 15.2 1.1.5 2.4.8 3.8.8 7.4 0 10.9-6.4 10.9-14.6 0-1.2-.3-2.4-.8-3.4z',
  ],
};

/* ------------------------------------------------------------------ */
/*  Loyalty                                                           */
/* ------------------------------------------------------------------ */

const CHECK: MotifArtwork = {
  filled: [
    'M12 2.2a9.8 9.8 0 1 1 0 19.6 9.8 9.8 0 0 1 0-19.6zm-1.2 13.6l-3.8-3.8 1.6-1.6 2.2 2.2 5.2-5.2 1.6 1.6-6.8 6.8z',
  ],
  outline: [
    EMPTY_RING,
    'M8 12.2l2.8 2.8 5.2-5.2',
  ],
};

const FLAME: MotifArtwork = {
  filled: [
    'M12 2.2c1.2 3.4-.6 5.6-2.2 7.6-1.8 2.2-3.4 4.2-3.4 7 0 3.8 2.6 6.6 5.6 6.6s5.6-2.8 5.6-6.6c0-2.4-1-4.4-2.2-6.4-.6 1.2-1.4 2.2-2.4 3 .8-3.6 1.4-7.2 1-11.2h2z',
  ],
  outline: [
    'M12 2.2c1.2 3.4-.6 5.6-2.2 7.6-1.8 2.2-3.4 4.2-3.4 7 0 3.8 2.6 6.6 5.6 6.6s5.6-2.8 5.6-6.6c0-2.4-1-4.4-2.2-6.4-.6 1.2-1.4 2.2-2.4 3 .8-3.6 1.4-7.2 1-11.2h2z',
  ],
};

const BOLT: MotifArtwork = {
  filled: [
    'M13.6 2.2L5.2 13.6h5.2l-1.2 8.2 8.6-11.8h-5.4l1.2-7.8z',
  ],
  outline: [
    'M13.6 2.2L5.2 13.6h5.2l-1.2 8.2 8.6-11.8h-5.4l1.2-7.8z',
  ],
};

const MEDAL: MotifArtwork = {
  filled: [
    // ribbons
    'M7.2 2.2h3.2L12 8.2l-2.4 4.2-3.2-6.4V2.2z',
    'M13.6 2.2h3.2v3.8l-3.2 6.4L11.2 8.2l2.4-6z',
    // disc
    'M12 11.2a5.4 5.4 0 1 1 0 10.8 5.4 5.4 0 0 1 0-10.8zm0 2.2a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4z',
  ],
  outline: [
    'M7.2 2.2h3.2L12 8.2l-2.4 4.2-3.2-6.4V2.2z',
    'M13.6 2.2h3.2v3.8l-3.2 6.4L11.2 8.2l2.4-6z',
    'M12 11.2a5.4 5.4 0 1 1 0 10.8 5.4 5.4 0 0 1 0-10.8zm0 2.2a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4z',
  ],
};

const ROCKET: MotifArtwork = {
  filled: [
    // body
    'M12 1.8c2.8 2.4 4.4 6 4.4 10.2v3.6H7.6v-3.6c0-4.2 1.6-7.8 4.4-10.2z',
    // window
    'M12 6.6a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6z',
    // fins
    'M7.6 12.2L4 16.4v3.2l3.6-2.2v-5.2z',
    'M16.4 12.2l3.6 4.2v3.2l-3.6-2.2v-5.2z',
    // flame
    'M9.2 17.2h5.6c0 2.4-1.2 4.2-2.8 5.2-1.6-1-2.8-2.8-2.8-5.2z',
  ],
  outline: [
    'M12 1.8c2.8 2.4 4.4 6 4.4 10.2v3.6H7.6v-3.6c0-4.2 1.6-7.8 4.4-10.2z',
    'M12 6.6a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6z',
    'M7.6 12.2L4 16.4v3.2l3.6-2.2v-5.2z',
    'M16.4 12.2l3.6 4.2v3.2l-3.6-2.2v-5.2z',
    'M9.2 17.2h5.6c0 2.4-1.2 4.2-2.8 5.2-1.6-1-2.8-2.8-2.8-5.2z',
  ],
};

const SPARKLE: MotifArtwork = {
  filled: [
    'M12 1.8l1.8 6.2 6.2 1.8-6.2 1.8-1.8 6.2-1.8-6.2-6.2-1.8 6.2-1.8L12 1.8z',
    'M19.2 14.6l.9 3 3 .9-3 .9-.9 3-.9-3-3-.9 3-.9.9-3z',
    'M5.4 2.2l.7 2.2 2.2.7-2.2.7-.7 2.2-.7-2.2-2.2-.7 2.2-.7.7-2.2z',
  ],
  outline: [
    'M12 1.8l1.8 6.2 6.2 1.8-6.2 1.8-1.8 6.2-1.8-6.2-6.2-1.8 6.2-1.8L12 1.8z',
    'M19.2 14.6l.9 3 3 .9-3 .9-.9 3-.9-3-3-.9 3-.9.9-3z',
    'M5.4 2.2l.7 2.2 2.2.7-2.2.7-.7 2.2-.7-2.2-2.2-.7 2.2-.7.7-2.2z',
  ],
};

const GEM_HEART_BADGE: MotifArtwork = {
  filled: [
    'M12 2.2l2.4 2.4h3.4v3.4l2.4 2.4-2.4 2.4v3.4h-3.4L12 21.8l-2.4-2.4H6.2v-3.4L3.8 11.4 6.2 9V5.6h3.4L12 2.2z',
  ],
  outline: [
    'M12 2.2l2.4 2.4h3.4v3.4l2.4 2.4-2.4 2.4v3.4h-3.4L12 21.8l-2.4-2.4H6.2v-3.4L3.8 11.4 6.2 9V5.6h3.4L12 2.2z',
  ],
};

const BELL_GIFT: MotifArtwork = {
  filled: [
    'M12 2.2a2.4 2.4 0 0 1 2.4 2.4c0 .8-.2 1.2-.2 2.2 3.2.6 5.6 3.4 5.6 6.8v2.2h2v2.4H4.2V16h2v-2.2c0-3.4 2.4-6.2 5.6-6.8 0-1-.2-1.4-.2-2.2A2.4 2.4 0 0 1 12 2.2z',
    'M10 20.2h4c0 1.2-.9 2-2 2s-2-.8-2-2z',
  ],
  outline: [
    'M12 2.2a2.4 2.4 0 0 1 2.4 2.4c0 .8-.2 1.2-.2 2.2 3.2.6 5.6 3.4 5.6 6.8v2.2h2v2.4H4.2V16h2v-2.2c0-3.4 2.4-6.2 5.6-6.8 0-1-.2-1.4-.2-2.2A2.4 2.4 0 0 1 12 2.2z',
    'M10 20.2h4c0 1.2-.9 2-2 2s-2-.8-2-2z',
  ],
};

/* ------------------------------------------------------------------ */
/*  Registry                                                          */
/* ------------------------------------------------------------------ */

export interface MotifEntry {
  id: string;
  name: string;
  group: 'food' | 'retail' | 'services' | 'loyalty';
  art: MotifArtwork;
  /** Paired empty/outlined variant id, when one exists. */
  emptyId?: string;
}

export const STAMP_MOTIFS: MotifEntry[] = [
  // Food & drink
  { id: 'motif-coffee', name: 'Coffee Cup', group: 'food', art: COFFEE, emptyId: 'motif-coffee-empty' },
  { id: 'motif-croissant', name: 'Croissant', group: 'food', art: CROISSANT, emptyId: 'motif-croissant-empty' },
  { id: 'motif-cocktail', name: 'Cocktail', group: 'food', art: COCKTAIL },
  { id: 'motif-pizza', name: 'Pizza Slice', group: 'food', art: PIZZA, emptyId: 'motif-pizza-empty' },
  { id: 'motif-burger', name: 'Burger', group: 'food', art: BURGER, emptyId: 'motif-burger-empty' },
  { id: 'motif-ice-cream', name: 'Ice Cream', group: 'food', art: ICE_CREAM },

  // Retail
  { id: 'motif-shopping-bag', name: 'Shopping Bag', group: 'retail', art: SHOPPING_BAG, emptyId: 'motif-shopping-bag-empty' },
  { id: 'motif-gift', name: 'Gift Box', group: 'retail', art: GIFT, emptyId: 'motif-gift-empty' },
  { id: 'motif-tag', name: 'Tag', group: 'retail', art: TAG },
  { id: 'motif-crown', name: 'Crown', group: 'retail', art: CROWN, emptyId: 'motif-crown-empty' },
  { id: 'motif-star', name: 'Star', group: 'retail', art: STAR, emptyId: 'motif-star-empty' },
  { id: 'motif-heart', name: 'Heart', group: 'retail', art: HEART, emptyId: 'motif-heart-empty' },
  { id: 'motif-diamond', name: 'Diamond', group: 'retail', art: DIAMOND },

  // Services
  { id: 'motif-scissors', name: 'Scissors', group: 'services', art: SCISSORS },
  { id: 'motif-spray', name: 'Spray Bottle', group: 'services', art: SPRAY },
  { id: 'motif-car', name: 'Car', group: 'services', art: CAR, emptyId: 'motif-car-empty' },
  { id: 'motif-barber', name: 'Scissors & Comb', group: 'services', art: BARBER },
  { id: 'motif-paw', name: 'Paw', group: 'services', art: PAW },
  { id: 'motif-leaf', name: 'Leaf', group: 'services', art: LEAF, emptyId: 'motif-leaf-empty' },

  // Loyalty
  { id: 'motif-check', name: 'Check', group: 'loyalty', art: CHECK, emptyId: 'motif-check-empty' },
  { id: 'motif-flame', name: 'Flame', group: 'loyalty', art: FLAME, emptyId: 'motif-flame-empty' },
  { id: 'motif-bolt', name: 'Bolt', group: 'loyalty', art: BOLT },
  { id: 'motif-medal', name: 'Medal', group: 'loyalty', art: MEDAL },
  { id: 'motif-rocket', name: 'Rocket', group: 'loyalty', art: ROCKET },
  { id: 'motif-sparkle', name: 'Sparkle', group: 'loyalty', art: SPARKLE },
  { id: 'motif-badge', name: 'Badge', group: 'loyalty', art: GEM_HEART_BADGE },
  { id: 'motif-bell', name: 'Bell', group: 'loyalty', art: BELL_GIFT },
];

/** Empty/outlined stamp variants — matched pairs for unfilled slots. */
export const STAMP_EMPTY_MOTIFS: MotifEntry[] = STAMP_MOTIFS.filter(
  (m): m is MotifEntry & { emptyId: string } => Boolean(m.emptyId),
).map((m) => ({
  id: m.emptyId,
  name: m.name,
  group: m.group,
  art: { filled: m.art.outline, outline: m.art.outline },
}));

export function getMotifById(id: string): MotifEntry | undefined {
  return (
    STAMP_MOTIFS.find((m) => m.id === id) ??
    STAMP_EMPTY_MOTIFS.find((m) => m.id === id)
  );
}

export function getMotifPaths(id: string, variant: 'filled' | 'outline' = 'filled'): string[] {
  const motif = getMotifById(id);
  if (!motif) return [];
  return variant === 'outline' ? motif.art.outline : motif.art.filled;
}

/**
 * Path art keyed by full icon id (filled + empty variants).
 */
export const MOTIF_ART: Record<string, MotifArtwork> = {
  'motif-coffee': COFFEE,
  'motif-coffee-empty': { filled: COFFEE.outline, outline: COFFEE.outline },
  'motif-croissant': CROISSANT,
  'motif-croissant-empty': { filled: CROISSANT.outline, outline: CROISSANT.outline },
  'motif-cocktail': COCKTAIL,
  'motif-pizza': PIZZA,
  'motif-pizza-empty': { filled: PIZZA.outline, outline: PIZZA.outline },
  'motif-burger': BURGER,
  'motif-burger-empty': { filled: BURGER.outline, outline: BURGER.outline },
  'motif-ice-cream': ICE_CREAM,
  'motif-shopping-bag': SHOPPING_BAG,
  'motif-shopping-bag-empty': { filled: SHOPPING_BAG.outline, outline: SHOPPING_BAG.outline },
  'motif-gift': GIFT,
  'motif-gift-empty': { filled: GIFT.outline, outline: GIFT.outline },
  'motif-tag': TAG,
  'motif-crown': CROWN,
  'motif-crown-empty': { filled: CROWN.outline, outline: CROWN.outline },
  'motif-star': STAR,
  'motif-star-empty': { filled: STAR.outline, outline: STAR.outline },
  'motif-heart': HEART,
  'motif-heart-empty': { filled: HEART.outline, outline: HEART.outline },
  'motif-diamond': DIAMOND,
  'motif-scissors': SCISSORS,
  'motif-spray': SPRAY,
  'motif-car': CAR,
  'motif-car-empty': { filled: CAR.outline, outline: CAR.outline },
  'motif-barber': BARBER,
  'motif-paw': PAW,
  'motif-leaf': LEAF,
  'motif-leaf-empty': { filled: LEAF.outline, outline: LEAF.outline },
  'motif-check': CHECK,
  'motif-check-empty': { filled: CHECK.outline, outline: CHECK.outline },
  'motif-flame': FLAME,
  'motif-flame-empty': { filled: FLAME.outline, outline: FLAME.outline },
  'motif-bolt': BOLT,
  'motif-medal': MEDAL,
  'motif-rocket': ROCKET,
  'motif-sparkle': SPARKLE,
  'motif-badge': GEM_HEART_BADGE,
  'motif-bell': BELL_GIFT,
};

/**
 * Motif metadata keyed by full icon id.
 */
export interface MotifMeta {
  id: string;
  name: string;
  group: 'food' | 'retail' | 'services' | 'loyalty';
  outline: boolean;
  filledId?: string;
  emptyId?: string;
}

export const MOTIF_META: Record<string, MotifMeta> = {
  'motif-coffee': { id: 'motif-coffee', name: 'Coffee Cup', group: 'food', outline: false, emptyId: 'motif-coffee-empty' },
  'motif-coffee-empty': { id: 'motif-coffee-empty', name: 'Coffee Cup', group: 'food', outline: true, filledId: 'motif-coffee' },
  'motif-croissant': { id: 'motif-croissant', name: 'Croissant', group: 'food', outline: false, emptyId: 'motif-croissant-empty' },
  'motif-croissant-empty': { id: 'motif-croissant-empty', name: 'Croissant', group: 'food', outline: true, filledId: 'motif-croissant' },
  'motif-cocktail': { id: 'motif-cocktail', name: 'Cocktail', group: 'food', outline: false },
  'motif-pizza': { id: 'motif-pizza', name: 'Pizza Slice', group: 'food', outline: false, emptyId: 'motif-pizza-empty' },
  'motif-pizza-empty': { id: 'motif-pizza-empty', name: 'Pizza Slice', group: 'food', outline: true, filledId: 'motif-pizza' },
  'motif-burger': { id: 'motif-burger', name: 'Burger', group: 'food', outline: false, emptyId: 'motif-burger-empty' },
  'motif-burger-empty': { id: 'motif-burger-empty', name: 'Burger', group: 'food', outline: true, filledId: 'motif-burger' },
  'motif-ice-cream': { id: 'motif-ice-cream', name: 'Ice Cream', group: 'food', outline: false },
  'motif-shopping-bag': { id: 'motif-shopping-bag', name: 'Shopping Bag', group: 'retail', outline: false, emptyId: 'motif-shopping-bag-empty' },
  'motif-shopping-bag-empty': { id: 'motif-shopping-bag-empty', name: 'Shopping Bag', group: 'retail', outline: true, filledId: 'motif-shopping-bag' },
  'motif-gift': { id: 'motif-gift', name: 'Gift Box', group: 'retail', outline: false, emptyId: 'motif-gift-empty' },
  'motif-gift-empty': { id: 'motif-gift-empty', name: 'Gift Box', group: 'retail', outline: true, filledId: 'motif-gift' },
  'motif-tag': { id: 'motif-tag', name: 'Tag', group: 'retail', outline: false },
  'motif-crown': { id: 'motif-crown', name: 'Crown', group: 'retail', outline: false, emptyId: 'motif-crown-empty' },
  'motif-crown-empty': { id: 'motif-crown-empty', name: 'Crown', group: 'retail', outline: true, filledId: 'motif-crown' },
  'motif-star': { id: 'motif-star', name: 'Star', group: 'retail', outline: false, emptyId: 'motif-star-empty' },
  'motif-star-empty': { id: 'motif-star-empty', name: 'Star', group: 'retail', outline: true, filledId: 'motif-star' },
  'motif-heart': { id: 'motif-heart', name: 'Heart', group: 'retail', outline: false, emptyId: 'motif-heart-empty' },
  'motif-heart-empty': { id: 'motif-heart-empty', name: 'Heart', group: 'retail', outline: true, filledId: 'motif-heart' },
  'motif-diamond': { id: 'motif-diamond', name: 'Diamond', group: 'retail', outline: false },
  'motif-scissors': { id: 'motif-scissors', name: 'Scissors', group: 'services', outline: false },
  'motif-spray': { id: 'motif-spray', name: 'Spray Bottle', group: 'services', outline: false },
  'motif-car': { id: 'motif-car', name: 'Car', group: 'services', outline: false, emptyId: 'motif-car-empty' },
  'motif-car-empty': { id: 'motif-car-empty', name: 'Car', group: 'services', outline: true, filledId: 'motif-car' },
  'motif-barber': { id: 'motif-barber', name: 'Scissors & Comb', group: 'services', outline: false },
  'motif-paw': { id: 'motif-paw', name: 'Paw', group: 'services', outline: false },
  'motif-leaf': { id: 'motif-leaf', name: 'Leaf', group: 'services', outline: false, emptyId: 'motif-leaf-empty' },
  'motif-leaf-empty': { id: 'motif-leaf-empty', name: 'Leaf', group: 'services', outline: true, filledId: 'motif-leaf' },
  'motif-check': { id: 'motif-check', name: 'Check', group: 'loyalty', outline: false, emptyId: 'motif-check-empty' },
  'motif-check-empty': { id: 'motif-check-empty', name: 'Check', group: 'loyalty', outline: true, filledId: 'motif-check' },
  'motif-flame': { id: 'motif-flame', name: 'Flame', group: 'loyalty', outline: false, emptyId: 'motif-flame-empty' },
  'motif-flame-empty': { id: 'motif-flame-empty', name: 'Flame', group: 'loyalty', outline: true, filledId: 'motif-flame' },
  'motif-bolt': { id: 'motif-bolt', name: 'Bolt', group: 'loyalty', outline: false },
  'motif-medal': { id: 'motif-medal', name: 'Medal', group: 'loyalty', outline: false },
  'motif-rocket': { id: 'motif-rocket', name: 'Rocket', group: 'loyalty', outline: false },
  'motif-sparkle': { id: 'motif-sparkle', name: 'Sparkle', group: 'loyalty', outline: false },
  'motif-badge': { id: 'motif-badge', name: 'Badge', group: 'loyalty', outline: false },
  'motif-bell': { id: 'motif-bell', name: 'Bell', group: 'loyalty', outline: false },
};

export type MotifId = keyof typeof MOTIF_ART;

/** Safe lookup — never returns undefined under `noUncheckedIndexedAccess`. */
export function motifArt(id: string): MotifArtwork {
  return MOTIF_ART[id] ?? { filled: [], outline: [] };
}
