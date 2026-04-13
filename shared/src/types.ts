// Defines contracts consumed by both client and server.
// Server generates EntityProfile; client receives and renders it.

export type Archetype = 'walking' | 'flying' | 'rooted' | 'spreading' | 'drifting' | 'stationary';

// Animation shape for an entity's motion. The archetype decides which subset is
// valid; numeric modifiers (speed/agility/energy) vary the feel within a shape.
export type MovementStyle =
  // flying
  | 'swooping'    // dive-and-rise arcs (eagle, hawk)
  | 'gliding'     // long smooth curves, minimal bob (plane, albatross)
  | 'hovering'    // near-stationary with micro-motion (hummingbird, helicopter)
  | 'darting'     // sharp direction changes (dragonfly, bat)
  | 'flapping'    // steady sine bob (pigeon, butterfly)
  // walking
  | 'prowling'    // low, deliberate, with pauses (wolf, cat)
  | 'scampering'  // fast + erratic turns (mouse, squirrel)
  | 'lumbering'   // slow, steady, minimal turning (bear, elephant)
  | 'hopping'     // discrete vertical arcs (rabbit, frog)
  // drifting
  | 'bobbing'     // vertical sine (jellyfish, balloon)
  | 'tumbling'    // rotation + drift (leaf, feather)
  // rooted
  | 'swaying'     // lateral sine (tree, kelp)
  // spreading
  | 'creeping'    // slow outward spawn (vine, moss)
  // stationary
  | 'still';      // no motion (rock, statue)

/** Styles valid for each archetype. */
export const STYLES_BY_ARCHETYPE: Record<Archetype, readonly MovementStyle[]> = {
  flying:     ['swooping', 'gliding', 'hovering', 'darting', 'flapping'],
  walking:    ['prowling', 'scampering', 'lumbering', 'hopping'],
  drifting:   ['bobbing', 'tumbling'],
  rooted:     ['swaying'],
  spreading:  ['creeping'],
  stationary: ['still'],
};

/** Default style per archetype — used when validation rejects or omits the style. */
export const DEFAULT_STYLE_BY_ARCHETYPE: Record<Archetype, MovementStyle> = {
  flying:     'flapping',
  walking:    'prowling',
  drifting:   'bobbing',
  rooted:     'swaying',
  spreading:  'creeping',
  stationary: 'still',
};

export interface EntityProfile {
  name: string;                 // e.g. "Wolf" — Title Case, single noun phrase
  archetype: Archetype;
  movementStyle: MovementStyle; // animation shape (must match archetype)
  speed: number;                // 1-10 — baseline velocity
  agility: number;              // 1-10 — turn responsiveness / direction changes
  energy: number;               // 1-10 — burstiness (low = steady, high = bursty/pausing)
  maxHealth: number;            // 1-100 — durability
}

// Interaction types — what one entity wants to do toward another
export type InteractionType = 'chase' | 'flee' | 'fight' | 'befriend' | 'ignore';

// One entity's relationships toward all other entities
// entityId is the integer ID assigned by the batch prompt (as string)
export interface EntityRelationship {
  entityId: string;
  relationships: Record<string, InteractionType>; // key: other entity's integer ID as string
}

// Full matrix of relationships for a set of entities
export interface InteractionMatrix {
  entries: EntityRelationship[];
}
