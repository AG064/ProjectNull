/**
 * Core type definitions for Project: Null Pointer.
 * All game objects, resources, and state shapes are defined here.
 */

// ─── Resources ───────────────────────────────────────────────────────────────

/** Every named resource in the game. Extend this union as new resources ship. */
export type ResourceId = 'silicon' | 'computePower' | 'fuel' | 'ice';

/** A snapshot of all resource quantities, keyed by ResourceId. */
export type ResourceMap = Record<ResourceId, number>;

// ─── Drone ───────────────────────────────────────────────────────────────────

export type DroneState = 'idle' | 'mining' | 'returning' | 'charging';

/** The data contract for a single drone instance. */
export interface DroneData {
  id: string;
  state: DroneState;
  /** Which resource this drone is currently tasked with collecting. */
  targetResource: ResourceId;
  /** Units of targetResource collected per tick while mining. */
  miningRate: number;
  /** 0-100 battery level; drones need power to operate. */
  battery: number;
}

// ─── Grid / Modules ──────────────────────────────────────────────────────────

export type ModuleType = 'serverRack' | 'coolingUnit' | 'powerGenerator' | 'empty';

export interface GridCell {
  moduleType: ModuleType;
  /** Heat units produced (+) or consumed (–) per tick. */
  heatDelta: number;
  /** Power units consumed per tick (negative means generates power). */
  powerDelta: number;
}

// ─── Game State ───────────────────────────────────────────────────────────────

export interface GameState {
  /** Running tick counter; increments each engine tick. */
  tick: number;
  resources: ResourceMap;
  drones: DroneData[];
  /** Global heat level of the station (0–100). */
  heatLevel: number;
  /** Whether the engine is currently running. */
  isRunning: boolean;
}

// ─── Engine Events ────────────────────────────────────────────────────────────

/** A strongly-typed event emitted after each engine tick. */
export interface TickEvent {
  tick: number;
  delta: Partial<ResourceMap>;
  heatDelta: number;
}

/** Subscriber callback signature for tick events. */
export type TickSubscriber = (event: TickEvent) => void;
