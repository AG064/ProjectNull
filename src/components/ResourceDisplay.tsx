/**
 * ResourceDisplay – shows a single resource's current value.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ResourceId } from '../engine/types';
import { RESOURCE_DEFS } from '../store/gameStore';

interface Props {
  resourceId: ResourceId;
  amount: number;
}

export const ResourceDisplay: React.FC<Props> = ({ resourceId, amount }) => {
  const def = RESOURCE_DEFS[resourceId];
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{def.label}</Text>
      <Text style={styles.value}>{Math.floor(amount).toLocaleString()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  label: {
    color: '#7ec8e3',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  value: {
    color: '#e0f4ff',
    fontSize: 15,
    fontFamily: 'monospace',
    minWidth: 80,
    textAlign: 'right',
  },
});
