import type { InteractionMatrix, InteractionType } from '@crayon-world/shared';

/**
 * Name-keyed mock relationships for the 6 mock entities.
 *
 * This is NOT a positional InteractionMatrix — it's a lookup from
 * `attacker name -> target name -> interaction`. The positional matrix is
 * built at request time by `buildMockMatrix` against whichever subset of
 * mock entities is actually in play, since `recognizeDrawingInternal` picks
 * mock entities randomly and insertion order in `_entityProfiles` is not
 * guaranteed to match MOCK_ENTITIES order. A fixed positional matrix would
 * (and did) hand the wrong row to the wrong entity — e.g. whichever entity
 * landed in slot 3 would inherit Fire's "chase everything" row.
 *
 * Relationships are ecologically plausible and asymmetric:
 * - Wolf and Eagle both flee Fire, ignore each other (different niches)
 * - Oak flees Fire and befriends Cloud (rain nourishes), ignored by most
 * - Fire ignores everything — the `spreading` archetype already handles
 *   "consumes by propagation"; giving Fire a chase row on top would double-dip
 * - Cloud befriends Oak (nourishes), ignores everything else
 * - Rock ignores everything (immovable, inert)
 */
const MOCK_RELATIONSHIPS: Record<string, Record<string, InteractionType>> = {
  Wolf:  { Eagle: 'ignore', Oak: 'ignore',   Fire: 'flee',     Cloud: 'ignore',   Rock: 'ignore' },
  Eagle: { Wolf:  'ignore', Oak: 'ignore',   Fire: 'flee',     Cloud: 'ignore',   Rock: 'ignore' },
  Oak:   { Wolf:  'ignore', Eagle: 'ignore', Fire: 'flee',     Cloud: 'befriend', Rock: 'ignore' },
  Fire:  { Wolf:  'ignore', Eagle: 'ignore', Oak:  'ignore',   Cloud: 'ignore',   Rock: 'ignore' },
  Cloud: { Wolf:  'ignore', Eagle: 'ignore', Oak:  'befriend', Fire:  'ignore',   Rock: 'ignore' },
  Rock:  { Wolf:  'ignore', Eagle: 'ignore', Oak:  'ignore',   Fire:  'ignore',   Cloud: 'ignore' },
};

/**
 * Build a positional InteractionMatrix for the given set of unique profiles,
 * using name-based lookups against the mock relationship table. Any pair that
 * isn't found in the table (e.g., a non-mock entity snuck in) defaults to 'ignore'.
 *
 * The caller must pass profiles in the same order it uses to assign prompt
 * entity IDs — this function assigns entityId by index so the resulting matrix
 * lines up with `_buildNameIdMap` on the GameRoom side.
 */
export function buildMockMatrix(profiles: Array<{ name: string }>): InteractionMatrix {
  return {
    entries: profiles.map((self, selfIdx) => {
      const selfRels = MOCK_RELATIONSHIPS[self.name];
      const relationships: Record<string, InteractionType> = {};
      profiles.forEach((other, otherIdx) => {
        if (otherIdx === selfIdx) return;
        relationships[String(otherIdx)] = selfRels?.[other.name] ?? 'ignore';
      });
      return {
        entityId: String(selfIdx),
        relationships,
      };
    }),
  };
}
