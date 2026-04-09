import { EntityProfile } from '@crayon-world/shared/src/types';

/**
 * EntityTooltip — lightweight HTML tooltip for entity behavior profiles.
 *
 * Follows the same pattern as RecognitionOverlay: create element on show,
 * remove on hide, no persistent DOM nodes.
 *
 * Tooltip content format (locked decision):
 *   Wolf — Walking
 *   Traits: predatory, pack hunter
 *   Role: Apex predator
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

  // Build content
  const header = document.createElement('div');
  header.className = 'mb-0.5 font-bold';
  header.textContent = `${profile.name} \u2014 ${archetype}`;

  const traits = document.createElement('div');
  traits.textContent = `Traits: ${profile.traits.join(', ')}`;

  const role = document.createElement('div');
  role.textContent = `Role: ${profile.role}`;

  activeTooltip.innerHTML = '';
  activeTooltip.appendChild(header);
  activeTooltip.appendChild(traits);
  activeTooltip.appendChild(role);

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
