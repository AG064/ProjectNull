/**
 * MainScreen – the primary game view.
 *
 * Shows:
 *  • Tick counter
 *  • Live Silicon and Compute Power counts
 *  • Station heat bar
 *  • Controls to start/stop engine and spawn drones
 */

import React, { useEffect } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useGameStore } from '../store/gameStore';
import { ResourceDisplay } from '../components/ResourceDisplay';
import { HeatBar } from '../components/HeatBar';

export const MainScreen: React.FC = () => {
  const tick = useGameStore(s => s.tick);
  const resources = useGameStore(s => s.resources);
  const heatLevel = useGameStore(s => s.heatLevel);
  const isRunning = useGameStore(s => s.isRunning);
  const drones = useGameStore(s => s.drones);
  const startEngine = useGameStore(s => s.startEngine);
  const stopEngine = useGameStore(s => s.stopEngine);
  const spawnDrone = useGameStore(s => s.spawnDrone);

  // Auto-start the engine when the screen mounts.
  // Zustand action references are stable (created once by `create()`),
  // so including them in the dep array is safe and satisfies the linter.
  useEffect(() => {
    startEngine();
    return () => {
      stopEngine();
    };
  }, [startEngine, stopEngine]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#050d1a" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>PROJECT: NULL POINTER</Text>
        <Text style={styles.subtitle}>Deep-Space Orbital Station</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ── Tick Counter ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ENGINE</Text>
          <Text style={styles.tickText}>
            Tick <Text style={styles.tickNum}>#{tick.toLocaleString()}</Text>
          </Text>
          <Text style={[styles.statusBadge, isRunning ? styles.running : styles.stopped]}>
            {isRunning ? '● RUNNING' : '■ STOPPED'}
          </Text>
        </View>

        {/* ── Resources ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>RESOURCES</Text>
          <ResourceDisplay resourceId="silicon" amount={resources.silicon} />
          <ResourceDisplay resourceId="computePower" amount={resources.computePower} />
          <ResourceDisplay resourceId="fuel" amount={resources.fuel} />
          <ResourceDisplay resourceId="ice" amount={resources.ice} />
        </View>

        {/* ── Heat ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>STATION SYSTEMS</Text>
          <HeatBar heatLevel={heatLevel} />
        </View>

        {/* ── Drones ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DRONES ({drones.length})</Text>
          {drones.length === 0 && (
            <Text style={styles.emptyText}>No drones deployed.</Text>
          )}
          {drones.map(d => (
            <View key={d.id} style={styles.droneRow}>
              <Text style={styles.droneId}>{d.id}</Text>
              <Text style={styles.droneTarget}>{d.targetResource}</Text>
              <Text style={styles.droneBattery}>🔋 {d.battery}%</Text>
              <Text style={styles.droneState}>{d.state}</Text>
            </View>
          ))}
        </View>

        {/* ── Controls ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>CONTROLS</Text>
          <TouchableOpacity
            style={[styles.btn, isRunning ? styles.btnStop : styles.btnStart]}
            onPress={isRunning ? stopEngine : startEngine}
          >
            <Text style={styles.btnText}>{isRunning ? 'PAUSE ENGINE' : 'START ENGINE'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnDrone]}
            onPress={() => spawnDrone('silicon', 2)}
          >
            <Text style={styles.btnText}>SPAWN SILICON DRONE (+2/tick)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnDrone]}
            onPress={() => spawnDrone('computePower', 1)}
          >
            <Text style={styles.btnText}>SPAWN COMPUTE DRONE (+1/tick)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const DARK_BG = '#050d1a';
const CARD_BG = '#0a1929';
const ACCENT = '#4fc3f7';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  header: {
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  title: {
    color: ACCENT,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 3,
  },
  subtitle: {
    color: '#4a6fa5',
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 2,
  },
  scroll: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    overflow: 'hidden',
    paddingTop: 12,
    paddingBottom: 4,
  },
  cardTitle: {
    color: '#4a6fa5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tickText: {
    color: '#7ec8e3',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  tickNum: {
    color: ACCENT,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  running: { color: '#66bb6a' },
  stopped: { color: '#ef5350' },
  emptyText: {
    color: '#4a6fa5',
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontStyle: 'italic',
  },
  droneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  droneId: { color: ACCENT, fontSize: 11, fontFamily: 'monospace' },
  droneTarget: { color: '#7ec8e3', fontSize: 11 },
  droneBattery: { color: '#ffb74d', fontSize: 11 },
  droneState: { color: '#4a6fa5', fontSize: 11, fontStyle: 'italic' },
  btn: {
    marginHorizontal: 16,
    marginVertical: 6,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnStart: { backgroundColor: '#1b5e20' },
  btnStop: { backgroundColor: '#7f0000' },
  btnDrone: { backgroundColor: '#1a3a5c' },
  btnText: {
    color: '#e0f4ff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
