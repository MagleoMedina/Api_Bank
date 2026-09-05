import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { ThemeColors } from '../../theme/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: 4,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.ink,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}

export function Header({ title, subtitle }: HeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}