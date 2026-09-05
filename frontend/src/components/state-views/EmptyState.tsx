import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { ThemeColors } from '../../theme/theme';

interface EmptyStateProps {
  message: string;
  hint?: string;
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: 12,
      paddingVertical: 32,
      paddingHorizontal: 16,
    },
    tile: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.secondaryBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileGlyph: {
      fontSize: 22,
      color: colors.textMuted,
    },
    message: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.ink,
      textAlign: 'center',
    },
    hint: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}

export function EmptyState({ message, hint }: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container} accessibilityRole="status">
      <View style={styles.tile}>
        <Text style={styles.tileGlyph}>⇄</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}