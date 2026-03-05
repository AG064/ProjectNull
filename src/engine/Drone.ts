/**
 * Drone – Object-Oriented base class for all mining drones.
 *
 * Designed for extension: subclasses override `mine()` to implement
 * different mining behaviours (e.g., speed drones, stealth drones, etc.).
 *
 * A Drone does NOT touch game state directly. Instead `mine()` returns the
 * number of resource units collected this tick, which the GameEngine applies.
 */

import type { DroneData, DroneState, ResourceId } from './types';

let _nextId = 1;

/**
 * Generate a unique drone ID.
 * Uses a monotonic counter combined with a timestamp fragment to remain
 * unique across hot reloads during development.
 */
function generateDroneId(): string {
  return `drone_${Date.now().toString(36)}_${_nextId++}`;
}

export abstract class BaseDrone {
  readonly id: string;
  protected _state: DroneState;
  readonly targetResource: ResourceId;
  protected _miningRate: number;
  protected _battery: number;

  constructor(targetResource: ResourceId, miningRate: number) {
    this.id = generateDroneId();
    this._state = 'idle';
    this.targetResource = targetResource;
    this._miningRate = miningRate;
    this._battery = 100;
  }

  get state(): DroneState {
    return this._state;
  }

  get miningRate(): number {
    return this._miningRate;
  }

  get battery(): number {
    return this._battery;
  }

  /** Begin mining. Returns false if the drone cannot start (e.g., low battery). */
  startMining(): boolean {
    if (this._battery <= 0) return false;
    this._state = 'mining';
    return true;
  }

  /** Return the drone to idle. */
  recall(): void {
    this._state = 'idle';
  }

  /**
   * Called every tick by the GameEngine.
   * @returns Amount of `targetResource` harvested this tick.
   */
  abstract mine(): number;

  /** Serialise to a plain data object for the Zustand store. */
  toData(): DroneData {
    return {
      id: this.id,
      state: this._state,
      targetResource: this.targetResource,
      miningRate: this._miningRate,
      battery: this._battery,
    };
  }
}

/**
 * StandardDrone – the default mining drone.
 * Collects `miningRate` units per tick at full battery.
 * Battery drains 1 point per tick; drones recharge to 100 when recalled.
 */
export class StandardDrone extends BaseDrone {
  constructor(targetResource: ResourceId, miningRate: number = 1) {
    super(targetResource, miningRate);
  }

  mine(): number {
    if (this._state !== 'mining') return 0;
    // Battery drain each active tick.
    this._battery = Math.max(0, this._battery - 1);
    if (this._battery === 0) {
      this._state = 'returning';
      return 0;
    }
    return this._miningRate;
  }

  /** Recharge the drone fully (called when returned to base). */
  recharge(): void {
    this._battery = 100;
    this._state = 'idle';
  }
}

/** Factory function – create and immediately start a standard mining drone. */
export function createMiningDrone(
  targetResource: ResourceId,
  miningRate: number = 1,
): StandardDrone {
  const drone = new StandardDrone(targetResource, miningRate);
  drone.startMining();
  return drone;
}
