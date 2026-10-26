import { INTRO_LINES, introTimeline, lineWidth } from '../splashIntro';

describe('opening animation', () => {
  const t = introTimeline();

  it('stays short', () => {
    expect(t.end).toBeLessThanOrEqual(1600);
  });

  it('runs lines, then the name, then the star, then fades', () => {
    expect(t.lineStart(INTRO_LINES - 1)).toBeLessThan(t.nameStart);
    expect(t.nameStart).toBeLessThan(t.starStart);
    expect(t.starStart).toBeLessThan(t.fadeStart);
    expect(t.fadeStart).toBeLessThan(t.end);
  });

  it('draws narrower lines further down', () => {
    expect(lineWidth(0)).toBeGreaterThan(lineWidth(INTRO_LINES - 1));
    expect(lineWidth(INTRO_LINES - 1)).toBeGreaterThan(0);
  });
});
