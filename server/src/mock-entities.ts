import type { EntityProfile } from '@crayon-world/shared';

export const MOCK_ENTITIES: EntityProfile[] = [
  {
    name: 'Wolf',
    archetype: 'walking',
    traits: ['predatory', 'pack animal'],
    role: 'Apex predator',
    speed: 7,
  },
  {
    name: 'Eagle',
    archetype: 'flying',
    traits: ['sharp vision', 'territorial'],
    role: 'Aerial hunter',
    speed: 8,
  },
  {
    name: 'Oak',
    archetype: 'rooted',
    traits: ['ancient', 'shelter-giving'],
    role: 'Ecosystem anchor',
    speed: 1,
  },
  {
    name: 'Fire',
    archetype: 'spreading',
    traits: ['consuming', 'unstoppable'],
    role: 'Force of nature',
    speed: 6,
  },
  {
    name: 'Cloud',
    archetype: 'drifting',
    traits: ['weightless', 'changing'],
    role: 'Sky wanderer',
    speed: 3,
  },
  {
    name: 'Rock',
    archetype: 'stationary',
    traits: ['immovable', 'enduring'],
    role: 'Landmark',
    speed: 1,
  },
];
