import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { ThemeColors } from '../../theme/theme';
import { Button } from '../Button/Button';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.dangerSurface,
      borderColor: colors.dangerBorder,
      borderWidth: 1,
      borderRadius: 14,
      padding: 20,
      gap: 8,
      alignItems: 'flex-start',
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.danger,
    },
    message: {
      fontSize: 14,
      color: colors.ink,
      lineHeight: 20,
    },
  });
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.title}>No se pudo consultar el saldo</Text>
      <Text style={styles.message}>{message}</Text>
      <Button
        label="Reintentar"
        onPress={onRetry}
        size="sm"
        accessibilityLabel="Reintentar consulta de saldo"
      />
    </View>
  );
}