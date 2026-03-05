/**
 * GameEngine – the deterministic central tick loop for Project: Null Pointer.
 *
 * Responsibilities:
 *  • Drive a fixed-interval tick clock (default 1 000 ms / tick).
 *  • Calculate resource deltas each tick by calling `mine()` on every live drone instance.
 *  • Emit a TickEvent to all registered subscribers after each tick.
 *  • Remain completely decoupled from React / UI concerns.
 *
 * Usage:
 *   const engine = new GameEngine();
 *   engine.subscribe(event => console.log(event));
 *   engine.start();
 *   // …later…
 *   engine.stop();
 */

import type { GameState, ResourceId, TickEvent, TickSubscriber } from './types';
import type { BaseDrone } from './Drone';
import { buildInitialResourceMap, RESOURCE_DEFINITIONS } from './resources';

/** Default tick interval in milliseconds. */
const DEFAULT_TICK_MS = 1_000;

export class GameEngine {
  /** Current game state; mutated in place each tick. */
  private state: GameState;

  /**
   * Live drone instances – these are the authoritative objects whose `mine()`
   * method is called each tick to update battery, state, and resource yield.
   * `state.drones` is derived from these after every tick.
   */
  private droneInstances: BaseDrone[] = [];

  /** Registered tick-event listeners. */
  private subscribers: Set<TickSubscriber> = new Set();

  /** Reference to the active setInterval handle (Node or browser). */
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  /** Tick duration in milliseconds. */
  private readonly tickMs: number;

  constructor(tickMs: number = DEFAULT_TICK_MS) {
    this.tickMs = tickMs;
    this.state = GameEngine.buildInitialState();
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  /** Start the tick loop. Safe to call multiple times (no-op if already running). */
  start(): void {
    if (this.intervalHandle !== null) return;
    this.intervalHandle = setInterval(() => this.tick(), this.tickMs);
  }

  /** Stop the tick loop. Safe to call when already stopped. */
  stop(): void {
    if (this.intervalHandle === null) return;
    clearInterval(this.intervalHandle);
    this.intervalHandle = null;
  }

  /** Returns true while the engine's interval is active. Derived from intervalHandle. */
  get isRunning(): boolean {
    return this.intervalHandle !== null;
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  /**
   * Returns a snapshot of the current game state safe to read from the UI.
   * Both `resources` and `drones` are copied so external mutations cannot
   * corrupt the engine's internal state.
   */
  getState(): Readonly<GameState> {
    return {
      ...this.state,
      resources: { ...this.state.resources },
      drones: [...this.state.drones],
      isRunning: this.isRunning,
    };
  }

  /**
   * Register a live drone instance with the engine.
   * The engine calls `drone.mine()` every tick, which updates the drone's
   * own battery and state. The serialized `DroneData` in `state.drones`
   * is refreshed automatically after each tick.
   */
  addDrone(drone: BaseDrone): void {
    this.droneInstances = [...this.droneInstances, drone];
    this.state.drones = this.droneInstances.map(d => d.toData());
  }

  /**
   * Directly set a resource amount. Use sparingly (cheat / debug / test).
   * Clamps to [0, maxAmount] where maxAmount is defined in RESOURCE_DEFINITIONS.
   */
  setResource(id: ResourceId, amount: number): void {
    const max = RESOURCE_DEFINITIONS[id].maxAmount;
    const clamped = Math.max(0, amount);
    this.state.resources[id] = max !== undefined ? Math.min(max, clamped) : clamped;
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  /** Register a callback to be called after every tick. Returns an unsubscribe function. */
  subscribe(subscriber: TickSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  /** Unregister a previously registered callback. */
  unsubscribe(subscriber: TickSubscriber): void {
    this.subscribers.delete(subscriber);
  }

  // ─── Core Tick Logic ───────────────────────────────────────────────────────

  /**
   * Process one deterministic tick.
   * Called internally by the interval; also callable directly for testing.
   */
  tick(): void {
    this.state.tick += 1;

    const delta: Partial<Record<ResourceId, number>> = {};
    const heatDelta = this.processDrones(delta);
    this.applyDeltas(delta);

    const event: TickEvent = {
      tick: this.state.tick,
      delta,
      heatDelta,
    };

    this.emit(event);
  }

  // ─── Private Subsystem Processors ──────────────────────────────────────────

  /**
   * Tick all live drone instances by calling `mine()` on each.
   * `mine()` is responsible for updating the drone's own battery and state machine.
   * The yielded amount is accumulated into the delta map.
   * Compute-power drones also generate heat proportional to their yield.
   * Returns the net heatDelta for this tick.
   *
   * Note: Grid-module processing (server racks, cooling units, power generators)
   * will replace this in Phase 2 with real spatial traversal.
   */
  private processDrones(delta: Partial<Record<ResourceId, number>>): number {
    let heatDelta = 0;

    for (const drone of this.droneInstances) {
      const yielded = drone.mine();
      if (yielded > 0) {
        delta[drone.targetResource] = (delta[drone.targetResource] ?? 0) + yielded;
        // Compute-power drones produce heat proportional to their output.
        if (drone.targetResource === 'computePower') {
          heatDelta += yielded * 0.1;
        }
      }
    }

    this.state.heatLevel = Math.min(100, Math.max(0, this.state.heatLevel + heatDelta));

    // Sync serialized drone data back to state after mine() may have mutated instances.
    this.state.drones = this.droneInstances.map(d => d.toData());

    return heatDelta;
  }

  /**
   * Apply the computed delta map to the state's resource counts.
   * Clamps each resource to [0, maxAmount] where a cap is defined.
   */
  private applyDeltas(delta: Partial<Record<ResourceId, number>>): void {
    for (const [key, value] of Object.entries(delta) as [ResourceId, number][]) {
      const current = this.state.resources[key] ?? 0;
      const next = Math.max(0, current + value);
      const max = RESOURCE_DEFINITIONS[key].maxAmount;
      this.state.resources[key] = max !== undefined ? Math.min(max, next) : next;
    }
  }

  /** Broadcast a TickEvent to all registered subscribers. */
  private emit(event: TickEvent): void {
    this.subscribers.forEach(sub => sub(event));
  }

  // ─── Static Helpers ────────────────────────────────────────────────────────

  /** Build the initial state for a new game session. */
  static buildInitialState(): GameState {
    return {
      tick: 0,
      resources: buildInitialResourceMap(),
      drones: [],
      heatLevel: 0,
      isRunning: false,
    };
  }
}

/** Singleton engine instance shared across the app. */
export const gameEngine = new GameEngine();
