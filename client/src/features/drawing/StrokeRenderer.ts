import { Graphics } from 'pixi.js';

export const THICKNESS_PRESETS = {
  thin: { size: 4 },
  medium: { size: 8 },
  thick: { size: 16 },
} as const;

export type ThicknessPreset = keyof typeof THICKNESS_PRESETS;

/** Smooth points by blending each with its neighbors. strength 0 = raw, 1 = max. */
function smoothPoints(pts: [number, number][], strength: number): [number, number][] {
  if (strength <= 0 || pts.length < 3) return pts;
  const t = Math.min(strength, 1);
  const out: [number, number][] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];
    out.push([
      curr[0] + t * ((prev[0] + next[0]) / 2 - curr[0]),
      curr[1] + t * ((prev[1] + next[1]) / 2 - curr[1]),
    ]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const SMOOTHING = 0.1;

/** Current stroke color — defaults to black, set via setStrokeColor(). */
let strokeColor = 0x000000;

/** Set the stroke color for all subsequent strokes. */
export function setStrokeColor(color: number): void {
  strokeColor = color;
}

export function renderStroke(
  gfx: Graphics,
  points: [number, number][],
  preset: ThicknessPreset,
): void {
  if (points.length < 2) {
    if (points.length === 1) {
      const r = THICKNESS_PRESETS[preset].size / 2;
      gfx.clear();
      gfx.circle(points[0][0], points[0][1], r).fill({ color: strokeColor });
    }
    return;
  }

  const smoothed = smoothPoints(points, SMOOTHING);

  gfx.clear();

  const [first, ...rest] = smoothed;
  gfx.moveTo(first[0], first[1]);

  for (const pt of rest) {
    gfx.lineTo(pt[0], pt[1]);
  }

  gfx.stroke({
    color: strokeColor,
    width: THICKNESS_PRESETS[preset].size,
    cap: 'round',
    join: 'round',
  });
}
