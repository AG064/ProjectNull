/**
 * HeatBar – visual indicator of the station's current heat level.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  heatLevel: number; // 0–100
}

export const HeatBar: React.FC<Props> = ({ heatLevel }) => {
  const clamped = Math.min(100, Math.max(0, heatLevel));
  const color = clamped < 50 ? '#4fc3f7' : clamped < 80 ? '#ffb74d' : '#ef5350';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Station Heat</Text>
      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${clamped}%` as `${number}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={[styles.percent, { color }]}>{clamped.toFixed(1)}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  label: {
    color: '#7ec8e3',
    fontSize: 13,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  track: {
    height: 10,
    backgroundColor: '#1e3a5f',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  percent: {
    fontSize: 11,
    marginTop: 3,
    textAlign: 'right',
  },
});
