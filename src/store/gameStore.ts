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
  /** Pause the engine. */
  stopEngine: () => void;

  /** Spawn a new mining drone for the given resource. */
  spawnDrone: (targetResource: ResourceId, miningRate?: number) => void;
}

export const useGameStore = create<GameStore>(set => ({
  // ─── Initial state (mirrors GameEngine.buildInitialState) ─────────────────
  ...gameEngine.getState(),

  // ─── Actions ───────────────────────────────────────────────────────────────

  startEngine: () => {
    // Avoid double-subscribing on hot-reload.
    if (gameEngine.isRunning) return;

    gameEngine.subscribe(() => {
      // Pull fresh state from the engine after each tick.
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
    gameEngine.stop();
    set({ isRunning: false });
  },

  spawnDrone: (targetResource: ResourceId, miningRate = 1) => {
    const drone = createMiningDrone(targetResource, miningRate);
    // Register the drone with the engine via the proper API.
    gameEngine.addDrone(drone.toData());
    // Reflect in store immediately (the next tick will refresh further).
    const engineState = gameEngine.getState();
    set({ drones: [...engineState.drones] });
  },
}));

/** Selector – resource definitions keyed by id for easy UI access. */
export const RESOURCE_DEFS = RESOURCE_DEFINITIONS;
