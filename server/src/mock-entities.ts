import type { EntityProfile } from '@crayon-world/shared';

export const MOCK_ENTITIES: EntityProfile[] = [
  { name: 'Wolf',  archetype: 'walking',    traits: ['predatory', 'pack animal'],    role: 'Apex predator' },
  { name: 'Eagle', archetype: 'flying',     traits: ['sharp vision', 'territorial'], role: 'Aerial hunter' },
  { name: 'Oak',   archetype: 'rooted',     traits: ['ancient', 'shelter-giving'],   role: 'Ecosystem anchor' },
  { name: 'Fire',  archetype: 'spreading',  traits: ['consuming', 'unstoppable'],    role: 'Force of nature' },
  { name: 'Cloud', archetype: 'drifting',   traits: ['weightless', 'changing'],      role: 'Sky wanderer' },
  { name: 'Rock',  archetype: 'stationary', traits: ['immovable', 'enduring'],       role: 'Landmark' },
];
