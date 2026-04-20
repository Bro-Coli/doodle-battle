import { EntityProfile } from '@crayon-world/shared/src/types';

/**
 * EntityTooltip — lightweight HTML tooltip for entity behavior profiles.
 *
 * Follows the same pattern as RecognitionOverlay: create element on show,
 * remove on hide, no persistent DOM nodes.
 *
 * Tooltip content format:
 *   Wolf — Walking (Prowling)
 *   HP 45 · Speed 7 · Agility 6 · Energy 5
 */

/** The currently visible tooltip element, or null if hidden. */
let activeTooltip: HTMLDivElement | null = null;

/**
 * Show (or update) the entity tooltip at the given screen position.
 *
 * @param profile - The entity's behavior profile
 * @param x - Absolute screen X (e.g., canvasBounds.left + e.global.x)
 * @param y - Absolute screen Y (e.g., canvasBounds.top + e.global.y)
 */
export function showTooltip(profile: EntityProfile, x: number, y: number): void {
  // Reuse existing tooltip if already visible; otherwise create a new one
  if (!activeTooltip) {
    const el = document.createElement('div');
    el.className =
      'pointer-events-none fixed z-[1000] max-w-[250px] rounded-md border border-neutral-300 bg-white px-3 py-2 text-[13px] leading-5 text-neutral-700 shadow-[0_2px_8px_rgba(0,0,0,0.15)]';
    document.body.appendChild(el);
    activeTooltip = el;
  }

  const archetype = profile.archetype.charAt(0).toUpperCase() + profile.archetype.slice(1);
  const style = profile.movementStyle.charAt(0).toUpperCase() + profile.movementStyle.slice(1);

  // Build content
  const header = document.createElement('div');
  header.className = 'mb-0.5 font-bold';
  header.textContent = `${profile.name} \u2014 ${archetype} (${style})`;

  const stats = document.createElement('div');
  stats.className = 'text-[12px] text-neutral-500';
  const speeds = [
    profile.landSpeed !== undefined ? `Land ${profile.landSpeed}` : null,
    profile.waterSpeed !== undefined ? `Water ${profile.waterSpeed}` : null,
    profile.airSpeed !== undefined ? `Air ${profile.airSpeed}` : null,
  ].filter(Boolean).join(' \u00B7 ');
  stats.textContent = `HP ${profile.maxHealth} \u00B7 ${profile.habitat} \u00B7 ${speeds} \u00B7 Agility ${profile.agility} \u00B7 Energy ${profile.energy}`;

  activeTooltip.innerHTML = '';
  activeTooltip.appendChild(header);
  activeTooltip.appendChild(stats);

  // Position tooltip offset from pointer to avoid flicker
  activeTooltip.style.left = `${x + 12}px`;
  activeTooltip.style.top = `${y + 12}px`;
}

/**
 * Hide and remove the active tooltip element, if any.
 */
export function hideTooltip(): void {
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}
