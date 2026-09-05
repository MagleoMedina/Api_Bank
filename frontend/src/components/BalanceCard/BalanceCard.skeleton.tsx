import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { ThemeColors } from '../../theme/theme';

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 20,
      gap: 16,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bar: {
      backgroundColor: colors.skeleton,
      borderRadius: 6,
      height: 14,
    },
    barShort: {
      width: '40%',
    },
    barMedium: {
      width: '55%',
    },
    barLong: {
      width: '75%',
    },
    amount: {
      backgroundColor: colors.skeleton,
      borderRadius: 8,
      height: 36,
      width: '70%',
    },
    badge: {
      width: 84,
      height: 24,
      borderRadius: 999,
    },
  });
}

export function BalanceCardSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 650,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 650,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.card, { opacity }]}
      accessibilityLabel="Cargando saldo"
      accessibilityRole="progressbar"
      aria-busy={true}
    >
      <View style={styles.row}>
        <View style={[styles.bar, styles.barShort]} />
        <View style={styles.badge} />
      </View>
      <View style={[styles.bar, styles.barMedium]} />
      <View style={styles.amount} />
      <View style={[styles.bar, styles.barLong]} />
    </Animated.View>
  );
}