// Defines contracts consumed by both client and server.
// Server generates EntityProfile; client receives and renders it.

export type Archetype =
  | 'walking'
  | 'flying'
  | 'rooted'
  | 'spreading'
  | 'drifting'
  | 'stationary';

export interface EntityProfile {
  name: string;        // e.g. "Wolf"
  archetype: Archetype;
  traits: string[];    // e.g. ["predatory", "pack hunter"]
  role: string;        // e.g. "Apex predator"
}
