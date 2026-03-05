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
      engine.addDrone(createMiningDrone('silicon', 3));

      engine.tick();

      expect(engine.getState().resources.silicon).toBe(3);
    });

    it('accumulates silicon over multiple ticks', () => {
      const engine = makeFreshEngine();
      engine.addDrone(createMiningDrone('silicon', 2));

      engine.tick();
      engine.tick();
      engine.tick();

      // 3 ticks × 2 per tick = 6
      expect(engine.getState().resources.silicon).toBe(6);
    });

    it('accumulates computePower from a compute drone each tick', () => {
      const engine = makeFreshEngine();
      engine.addDrone(createMiningDrone('computePower', 5));

      engine.tick();

      expect(engine.getState().resources.computePower).toBe(5);
    });

    it('supports multiple drones mining different resources simultaneously', () => {
      const engine = makeFreshEngine();
      engine.addDrone(createMiningDrone('silicon', 4));
      engine.addDrone(createMiningDrone('computePower', 2));

      engine.tick();

      expect(engine.getState().resources.silicon).toBe(4);
      expect(engine.getState().resources.computePower).toBe(2);
    });
  });

  describe('drone battery drain through engine ticks', () => {
    it('drone battery decreases after each engine tick', () => {
      const engine = makeFreshEngine();
      const drone = createMiningDrone('silicon', 1);
      engine.addDrone(drone);

      engine.tick();
      engine.tick();

      // After 2 ticks the serialized DroneData battery should be 98.
      const droneData = engine.getState().drones[0];
      expect(droneData.battery).toBe(98);
    });

    it('drone transitions to returning state when battery depletes', () => {
      const engine = makeFreshEngine();
      // Use high miningRate so battery is the only variable that matters.
      const drone = createMiningDrone('silicon', 1);
      engine.addDrone(drone);

      // Run 100 ticks to drain battery from 100 to 0.
      for (let i = 0; i < 100; i++) engine.tick();

      const droneData = engine.getState().drones[0];
      expect(droneData.state).toBe('returning');
      expect(droneData.battery).toBe(0);
    });

    it('drone stops yielding resources after battery depletes', () => {
      const engine = makeFreshEngine();
      const drone = createMiningDrone('silicon', 5);
      engine.addDrone(drone);

      // Drain battery fully.
      for (let i = 0; i < 100; i++) engine.tick();
      const siliconAfterDrain = engine.getState().resources.silicon;

      // Additional ticks should not increase silicon.
      engine.tick();
      engine.tick();
      expect(engine.getState().resources.silicon).toBe(siliconAfterDrain);
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

    it('clamps to maxAmount when defined (computePower cap 1000)', () => {
      const engine = makeFreshEngine();
      engine.setResource('computePower', 9999);
      expect(engine.getState().resources.computePower).toBe(1000);
    });

    it('does not clamp uncapped resources (silicon has no max)', () => {
      const engine = makeFreshEngine();
      engine.setResource('silicon', 999999);
      expect(engine.getState().resources.silicon).toBe(999999);
    });
  });

  describe('applyDeltas respects maxAmount cap', () => {
    it('computePower does not exceed 1000 from tick accumulation', () => {
      const engine = makeFreshEngine();
      // Set computePower near cap.
      engine.setResource('computePower', 999);
      // Drone yields 5 per tick but cap is 1000.
      engine.addDrone(createMiningDrone('computePower', 5));

      engine.tick();

      expect(engine.getState().resources.computePower).toBe(1000);
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
    it('resources copy: mutations do not affect engine state', () => {
      const engine = makeFreshEngine();
      const state = engine.getState();
      state.resources.silicon = 9999;

      expect(engine.getState().resources.silicon).toBe(0);
    });

    it('drones copy: push on snapshot does not affect engine state', () => {
      const engine = makeFreshEngine();
      engine.addDrone(createMiningDrone('silicon', 1));

      const snapshot = engine.getState();
      // Mutating the snapshot's drones array should not affect the engine.
      (snapshot.drones as unknown[]).push({ fake: true });

      expect(engine.getState().drones).toHaveLength(1);
    });

    it('drones deep copy: mutating a DroneData element does not affect engine state', () => {
      const engine = makeFreshEngine();
      engine.addDrone(createMiningDrone('silicon', 1));

      const snapshot = engine.getState();
      // Mutating a property on a returned DroneData object should not corrupt the engine.
      snapshot.drones[0].battery = 0;

      expect(engine.getState().drones[0].battery).toBe(100);
    });
  });

  describe('start/stop lifecycle', () => {
    afterEach(() => {
      // Ensure fake timers are fully cleaned up after each test, even if a test fails.
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('isRunning is true after start()', () => {
      jest.useFakeTimers();
      const engine = makeFreshEngine();
      engine.start();
      expect(engine.isRunning).toBe(true);
      engine.stop();
    });

    it('isRunning is false after stop()', () => {
      jest.useFakeTimers();
      const engine = makeFreshEngine();
      engine.start();
      engine.stop();
      expect(engine.isRunning).toBe(false);
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
