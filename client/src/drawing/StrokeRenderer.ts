import { getStroke } from 'perfect-freehand';
import { Graphics } from 'pixi.js';

export const THICKNESS_PRESETS = {
  thin: {
    size: 4,
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.4,
    simulatePressure: true,
  },
  medium: {
    size: 8,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.4,
    simulatePressure: true,
  },
  thick: {
    size: 16,
    thinning: 0.4,
    smoothing: 0.5,
    streamline: 0.4,
    simulatePressure: true,
  },
} as const;

export type ThicknessPreset = keyof typeof THICKNESS_PRESETS;

export function renderStroke(
  gfx: Graphics,
  points: [number, number][],
  preset: ThicknessPreset,
): void {
  const outline = getStroke(points, THICKNESS_PRESETS[preset]);

  if (outline.length < 2) return;

  gfx.clear();

  // Build smooth path using midpoints (Pattern 2 from research)
  const [first, ...rest] = outline;
  gfx.moveTo(first[0], first[1]);

  for (let i = 0; i < rest.length - 1; i++) {
    const curr = rest[i];
    const next = rest[i + 1];
    const midX = (curr[0] + next[0]) / 2;
    const midY = (curr[1] + next[1]) / 2;
    gfx.quadraticCurveTo(curr[0], curr[1], midX, midY);
  }

  // Close to last point
  const last = rest[rest.length - 1];
  gfx.lineTo(last[0], last[1]);

  gfx.fill({ color: 0x000000 });
}
