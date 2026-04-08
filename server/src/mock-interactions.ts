import type { InteractionMatrix } from '@crayon-world/shared';

/**
 * Hardcoded interaction matrix for the 6 mock entities.
 * Entity IDs match MOCK_ENTITIES order: Wolf=0, Eagle=1, Oak=2, Fire=3, Cloud=4, Rock=5
 *
 * Relationships are ecologically plausible and asymmetric:
 * - Wolf and Eagle both flee fire, ignore each other (different ecological niches)
 * - Oak flees fire and benefits from cloud (rain), ignored by most
 * - Fire chases Wolf, Eagle, Oak (consumes all organic life)
 * - Cloud befriends Oak (nourishes) and chases Fire (extinguishes)
 * - Rock ignores everything (immovable, inert)
 */
export const MOCK_INTERACTION_MATRIX: InteractionMatrix = {
  entries: [
    {
      // Wolf (id: 0)
      entityId: '0',
      relationships: {
        '1': 'ignore',   // toward Eagle
        '2': 'ignore',   // toward Oak
        '3': 'flee',     // toward Fire
        '4': 'ignore',   // toward Cloud
        '5': 'ignore',   // toward Rock
      },
    },
    {
      // Eagle (id: 1)
      entityId: '1',
      relationships: {
        '0': 'ignore',   // toward Wolf
        '2': 'ignore',   // toward Oak
        '3': 'flee',     // toward Fire
        '4': 'ignore',   // toward Cloud
        '5': 'ignore',   // toward Rock
      },
    },
    {
      // Oak (id: 2)
      entityId: '2',
      relationships: {
        '0': 'ignore',   // toward Wolf
        '1': 'ignore',   // toward Eagle
        '3': 'flee',     // toward Fire
        '4': 'befriend', // toward Cloud (rain nourishes)
        '5': 'ignore',   // toward Rock
      },
    },
    {
      // Fire (id: 3)
      entityId: '3',
      relationships: {
        '0': 'chase',    // toward Wolf
        '1': 'chase',    // toward Eagle
        '2': 'chase',    // toward Oak
        '4': 'ignore',   // toward Cloud
        '5': 'ignore',   // toward Rock
      },
    },
    {
      // Cloud (id: 4)
      entityId: '4',
      relationships: {
        '0': 'ignore',   // toward Wolf
        '1': 'ignore',   // toward Eagle
        '2': 'befriend', // toward Oak (nourishes with rain)
        '3': 'chase',    // toward Fire (rain extinguishes)
        '5': 'ignore',   // toward Rock
      },
    },
    {
      // Rock (id: 5)
      entityId: '5',
      relationships: {
        '0': 'ignore',   // toward Wolf
        '1': 'ignore',   // toward Eagle
        '2': 'ignore',   // toward Oak
        '3': 'ignore',   // toward Fire
        '4': 'ignore',   // toward Cloud
      },
    },
  ],
} satisfies InteractionMatrix;
