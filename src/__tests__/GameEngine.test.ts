/**
 * GameEngine unit tests.
 *
 * Tests the deterministic tick system, resource accumulation,
 * drone processing, and subscriber notifications.
 */

import { GameEngine } from '../engine/GameEngine';
import { StandardDrone, createMiningDrone } from '../engine/Drone';
import type { TickEvent } from '../engine/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFreshEngine(): GameEngine {
  return new GameEngine(/* tickMs – not used in manual ticks */);
}

// ─── GameEngine ───────────────────────────────────────────────────────────────

describe('GameEngine', () => {
  describe('initial state', () => {
    it('starts at tick 0', () => {
      const engine = makeFreshEngine();
      expect(engine.getState().tick).toBe(0);
    });

    it('initialises silicon to 0', () => {
      const engine = makeFreshEngine();
      expect(engine.getState().resources.silicon).toBe(0);
    });

    it('initialises computePower to 0', () => {
      const engine = makeFreshEngine();
      expect(engine.getState().resources.computePower).toBe(0);
    });

    it('initialises fuel to 50 (per resource definition)', () => {
      const engine = makeFreshEngine();
      expect(engine.getState().resources.fuel).toBe(50);
    });

    it('starts not running', () => {
      const engine = makeFreshEngine();
      expect(engine.isRunning).toBe(false);
    });
  });

  describe('tick counter', () => {
    it('increments by 1 per manual tick', () => {
      const engine = makeFreshEngine();
      engine.tick();
      expect(engine.getState().tick).toBe(1);
      engine.tick();
      expect(engine.getState().tick).toBe(2);
    });

    it('increments 10 times correctly', () => {
      const engine = makeFreshEngine();
      for (let i = 0; i < 10; i++) engine.tick();
      expect(engine.getState().tick).toBe(10);
    });
  });

  describe('resource accumulation with drones', () => {
    it('accumulates silicon from a mining drone each tick', () => {
      const engine = makeFreshEngine();
      const drone = createMiningDrone('silicon', 3);
      engine.getState().drones.push(drone.toData());

      engine.tick();

      expect(engine.getState().resources.silicon).toBe(3);
    });

    it('accumulates silicon over multiple ticks', () => {
      const engine = makeFreshEngine();
      const drone = createMiningDrone('silicon', 2);
      engine.getState().drones.push(drone.toData());

      engine.tick();
      engine.tick();
      engine.tick();

      // 3 ticks × 2 per tick = 6
      expect(engine.getState().resources.silicon).toBe(6);
    });

    it('accumulates computePower from a compute drone each tick', () => {
      const engine = makeFreshEngine();
      const drone = createMiningDrone('computePower', 5);
      engine.getState().drones.push(drone.toData());

      engine.tick();

      expect(engine.getState().resources.computePower).toBe(5);
    });

    it('supports multiple drones mining different resources simultaneously', () => {
      const engine = makeFreshEngine();
      const siliconDrone = createMiningDrone('silicon', 4);
      const computeDrone = createMiningDrone('computePower', 2);
      engine.getState().drones.push(siliconDrone.toData(), computeDrone.toData());

      engine.tick();

      expect(engine.getState().resources.silicon).toBe(4);
      expect(engine.getState().resources.computePower).toBe(2);
    });
  });

  describe('setResource', () => {
    it('directly sets a resource amount', () => {
      const engine = makeFreshEngine();
      engine.setResource('silicon', 100);
      expect(engine.getState().resources.silicon).toBe(100);
    });

    it('clamps negative values to 0', () => {
      const engine = makeFreshEngine();
      engine.setResource('silicon', -50);
      expect(engine.getState().resources.silicon).toBe(0);
    });
  });

  describe('subscriber pattern', () => {
    it('calls subscriber after each tick', () => {
      const engine = makeFreshEngine();
      const handler = jest.fn();
      engine.subscribe(handler);

      engine.tick();
      engine.tick();

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('passes correct tick number in event', () => {
      const engine = makeFreshEngine();
      const events: TickEvent[] = [];
      engine.subscribe(e => events.push(e));

      engine.tick();
      engine.tick();

      expect(events[0].tick).toBe(1);
      expect(events[1].tick).toBe(2);
    });

    it('returns an unsubscribe function that stops notifications', () => {
      const engine = makeFreshEngine();
      const handler = jest.fn();
      const unsub = engine.subscribe(handler);

      engine.tick();
      unsub();
      engine.tick();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('supports multiple independent subscribers', () => {
      const engine = makeFreshEngine();
      const h1 = jest.fn();
      const h2 = jest.fn();
      engine.subscribe(h1);
      engine.subscribe(h2);

      engine.tick();

      expect(h1).toHaveBeenCalledTimes(1);
      expect(h2).toHaveBeenCalledTimes(1);
    });
  });

  describe('getState immutability', () => {
    it('returns a copy so mutations do not affect engine state', () => {
      const engine = makeFreshEngine();
      const state = engine.getState();
      state.resources.silicon = 9999;

      expect(engine.getState().resources.silicon).toBe(0);
    });
  });

  describe('start/stop lifecycle', () => {
    afterEach(() => {
      // Ensure timers are cleared after each test.
      jest.clearAllTimers();
    });

    it('isRunning is true after start()', () => {
      jest.useFakeTimers();
      const engine = makeFreshEngine();
      engine.start();
      expect(engine.isRunning).toBe(true);
      engine.stop();
      jest.useRealTimers();
    });

    it('isRunning is false after stop()', () => {
      jest.useFakeTimers();
      const engine = makeFreshEngine();
      engine.start();
      engine.stop();
      expect(engine.isRunning).toBe(false);
      jest.useRealTimers();
    });

    it('calling start() twice does not create duplicate intervals', () => {
      jest.useFakeTimers();
      const engine = makeFreshEngine();
      const handler = jest.fn();
      engine.subscribe(handler);

      engine.start();
      engine.start(); // second call should be no-op

      jest.advanceTimersByTime(1000);
      expect(handler).toHaveBeenCalledTimes(1);

      engine.stop();
      jest.useRealTimers();
    });
  });
});

// ─── Drone ────────────────────────────────────────────────────────────────────

describe('StandardDrone', () => {
  it('starts in idle state', () => {
    const drone = new StandardDrone('silicon');
    expect(drone.state).toBe('idle');
  });

  it('transitions to mining state on startMining()', () => {
    const drone = new StandardDrone('silicon');
    drone.startMining();
    expect(drone.state).toBe('mining');
  });

  it('returns miningRate on mine() while active', () => {
    const drone = new StandardDrone('silicon', 5);
    drone.startMining();
    expect(drone.mine()).toBe(5);
  });

  it('returns 0 on mine() when idle', () => {
    const drone = new StandardDrone('silicon', 5);
    expect(drone.mine()).toBe(0);
  });

  it('drains battery each tick', () => {
    const drone = new StandardDrone('silicon', 1);
    drone.startMining();
    drone.mine(); // battery: 99
    expect(drone.battery).toBe(99);
  });

  it('transitions to returning when battery hits 0', () => {
    const drone = new StandardDrone('silicon', 1);
    drone.startMining();
    // Drain battery to 0
    for (let i = 0; i < 100; i++) drone.mine();
    expect(drone.state).toBe('returning');
  });

  it('recharges back to 100 and idles after recharge()', () => {
    const drone = new StandardDrone('silicon', 1);
    drone.startMining();
    for (let i = 0; i < 100; i++) drone.mine();
    drone.recharge();
    expect(drone.battery).toBe(100);
    expect(drone.state).toBe('idle');
  });

  it('serialises to DroneData correctly', () => {
    const drone = new StandardDrone('computePower', 3);
    drone.startMining();
    const data = drone.toData();
    expect(data.targetResource).toBe('computePower');
    expect(data.miningRate).toBe(3);
    expect(data.state).toBe('mining');
  });
});

describe('createMiningDrone', () => {
  it('creates a drone already in mining state', () => {
    const drone = createMiningDrone('ice', 2);
    expect(drone.state).toBe('mining');
  });

  it('uses the provided mining rate', () => {
    const drone = createMiningDrone('fuel', 7);
    expect(drone.miningRate).toBe(7);
  });
});
