// Opening animation (PLAN.md "מסך פתיחה", option א): lines draw in, then the name, then ✦.
// Pure timing only, so it is tested in Jest; SplashIntro.tsx plays it.

export const INTRO_LINES = 6;
export const LINE_MS = 380;
export const LINE_STAGGER_MS = 60;
export const NAME_MS = 300;
export const STAR_MS = 220;
export const HOLD_MS = 250;
export const FADE_OUT_MS = 250;

/** When each part starts, and when the whole intro is gone (ms from start). */
export function introTimeline() {
  const linesEnd = (INTRO_LINES - 1) * LINE_STAGGER_MS + LINE_MS;
  const nameStart = linesEnd - 120;
  const starStart = nameStart + NAME_MS - 60;
  const fadeStart = starStart + STAR_MS + HOLD_MS;
  return {
    lineStart: (i: number) => i * LINE_STAGGER_MS,
    nameStart,
    starStart,
    fadeStart,
    end: fadeStart + FADE_OUT_MS,
  };
}

/** Line widths shrink a little, like the mockup. */
export function lineWidth(i: number): number {
  return 150 - i * 8;
}
