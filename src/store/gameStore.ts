/**
 * Zustand game store – the single source of truth for all UI-visible state.
 *
 * The store is kept in sync with the GameEngine via a tick subscriber.
 * React components read from this store; they never touch the engine directly.
 */

import { create } from 'zustand';
import type { GameState, ResourceId } from '../engine/types';
import { gameEngine } from '../engine/GameEngine';
import { createMiningDrone } from '../engine/Drone';
import { RESOURCE_DEFINITIONS } from '../engine/resources';

export interface GameStore extends GameState {
  // ─── Actions ───────────────────────────────────────────────────────────────

  /** Start the engine and wire up the store subscriber. */
  startEngine: () => void;
  /** Pause the engine and remove the tick subscriber. */
  stopEngine: () => void;

  /** Spawn a new mining drone for the given resource. */
  spawnDrone: (targetResource: ResourceId, miningRate?: number) => void;
}

export const useGameStore = create<GameStore>(set => {
  // Closure-scoped handle to the current tick subscription.
  // Kept outside Zustand state so it isn't serialized and never triggers re-renders.
  let engineUnsubscribe: (() => void) | null = null;

  return {
    // ─── Initial state (mirrors GameEngine.buildInitialState) ─────────────────
    ...gameEngine.getState(),

    // ─── Actions ───────────────────────────────────────────────────────────────

    startEngine: () => {
      // Avoid double-subscribing: check the subscription handle, not engine.isRunning,
      // so we can re-subscribe even when the engine was started elsewhere.
      if (engineUnsubscribe !== null) return;

      engineUnsubscribe = gameEngine.subscribe(() => {
        // Pull a fresh snapshot from the engine after each tick.
        const engineState = gameEngine.getState();
        set({
          tick: engineState.tick,
          resources: { ...engineState.resources },
          heatLevel: engineState.heatLevel,
          drones: [...engineState.drones],
          isRunning: engineState.isRunning,
        });
      });

      gameEngine.start();
      set({ isRunning: true });
    },

    stopEngine: () => {
      // Remove the tick subscriber to prevent duplicate listeners on restart.
      if (engineUnsubscribe !== null) {
        engineUnsubscribe();
        engineUnsubscribe = null;
      }
      gameEngine.stop();
      set({ isRunning: false });
    },

    spawnDrone: (targetResource: ResourceId, miningRate = 1) => {
      // Create the live drone instance and hand it to the engine.
      // The engine calls mine() on it every tick; getState() serializes it.
      const drone = createMiningDrone(targetResource, miningRate);
      gameEngine.addDrone(drone);
      // Reflect in store immediately (the next tick will refresh further).
      const engineState = gameEngine.getState();
      set({ drones: [...engineState.drones] });
    },
  };
});

/** Selector – resource definitions keyed by id for easy UI access. */
export const RESOURCE_DEFS = RESOURCE_DEFINITIONS;
