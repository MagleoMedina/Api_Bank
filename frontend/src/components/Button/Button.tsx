import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { ThemeColors } from '../../theme/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'sm';
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },
    md: {
      minHeight: 48,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sm: {
      minHeight: 32,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    pseudo: {
      backgroundColor: colors.skeleton,
    },
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: colors.secondaryBg,
    },
    pressed: {
      opacity: 0.75,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    labelPrimary: {
      color: colors.onPrimary,
    },
    labelSecondary: {
      color: colors.secondaryLabel,
    },
    labelDisabled: {
      color: colors.textMuted,
    },
    labelSm: {
      fontSize: 13,
    },
  });
}

export function Button({
  label,
  onPress,
  variant = 'secondary',
  size = 'md',
  disabled,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const isDisabled = disabled === true;
  const isPrimary = variant === 'primary';
  const isSmall = size === 'sm';
  const labelStyles = [
    styles.label,
    isSmall && styles.labelSm,
    isDisabled
      ? styles.labelDisabled
      : isPrimary
        ? styles.labelPrimary
        : styles.labelSecondary,
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isSmall ? styles.sm : styles.md,
        isDisabled
          ? styles.pseudo
          : isPrimary
            ? styles.primary
            : styles.secondary,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      <Text style={labelStyles}>{label}</Text>
    </Pressable>
  );
}