/**
 * Static resource definitions – base production rates and display metadata.
 * These are the "blueprint" values; runtime quantities live in the store.
 */

import type { ResourceId } from './types';

export interface ResourceDefinition {
  id: ResourceId;
  /** Human-readable label shown in the UI. */
  label: string;
  /** Starting quantity at game initialisation. */
  initialAmount: number;
  /** Hard cap – undefined means uncapped. */
  maxAmount?: number;
  /** Icon name (maps to an asset; extend as needed). */
  icon: string;
}

export const RESOURCE_DEFINITIONS: Readonly<Record<ResourceId, ResourceDefinition>> = {
  silicon: {
    id: 'silicon',
    label: 'Silicon',
    initialAmount: 0,
    icon: 'silicon',
  },
  computePower: {
    id: 'computePower',
    label: 'Compute Power',
    initialAmount: 0,
    maxAmount: 1000,
    icon: 'compute',
  },
  fuel: {
    id: 'fuel',
    label: 'Fuel',
    initialAmount: 50,
    icon: 'fuel',
  },
  ice: {
    id: 'ice',
    label: 'Ice',
    initialAmount: 0,
    icon: 'ice',
  },
} as const;

/** Returns the initial ResourceMap seeded from each definition's `initialAmount`. */
export function buildInitialResourceMap(): Record<ResourceId, number> {
  return (Object.values(RESOURCE_DEFINITIONS) as ResourceDefinition[]).reduce(
    (acc, def) => {
      acc[def.id] = def.initialAmount;
      return acc;
    },
    {} as Record<ResourceId, number>,
  );
}
