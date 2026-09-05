import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { AccountBalance } from '../../api/api';
import { useTheme } from '../../theme/ThemeProvider';
import type { ThemeColors } from '../../theme/theme';
import { formatAmount, formatDate } from '../../utils/format';

interface BalanceCardProps {
  data: AccountBalance;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

const BANK_NAMES: Record<string, string> = {
  bdv: 'Banco de Venezuela',
  mock: 'Modo de prueba',
};

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 20,
      gap: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    bankLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      flexShrink: 1,
    },
    refreshButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondaryBg,
    },
    refreshGlyph: {
      fontSize: 20,
      color: colors.secondaryLabel,
      lineHeight: 24,
    },
    refreshPressed: {
      opacity: 0.7,
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    accountText: {
      fontSize: 15,
      color: colors.ink,
      fontWeight: '500',
    },
    accountType: {
      fontSize: 13,
      color: colors.textMuted,
      textTransform: 'capitalize',
    },
    amount: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.ink,
      letterSpacing: 0.2,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 4,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeLive: {
      backgroundColor: colors.liveBg,
    },
    badgeCache: {
      backgroundColor: colors.cacheBg,
    },
    badgeDot: {
      fontSize: 8,
    },
    badgeDotLive: {
      color: colors.liveLabel,
    },
    badgeDotCache: {
      color: colors.cacheLabel,
    },
    badgeLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    badgeLabelLive: {
      color: colors.liveLabel,
    },
    badgeLabelCache: {
      color: colors.cacheLabel,
    },
    fetchedAt: {
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}

export function BalanceCard({
  data,
  isRefreshing,
  onRefresh,
}: BalanceCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const isLive = data.source === 'live';
  const bankName = BANK_NAMES[data.bankId] ?? data.bankId.toUpperCase();
  const refreshing = isRefreshing === true;

  return (
    <View
      style={styles.card}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Saldo ${bankName}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.bankLabel}>{bankName}</Text>
        {onRefresh ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar saldo"
            accessibilityState={{ disabled: refreshing }}
            disabled={refreshing}
            onPress={onRefresh}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.refreshPressed,
            ]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.refreshGlyph}>↻</Text>
            )}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountText}>{data.account}</Text>
        {data.accountType ? (
          <Text style={styles.accountType}>{data.accountType}</Text>
        ) : null}
      </View>

      <Text
        style={styles.amount}
        accessibilityLabel="Saldo disponible"
        accessibilityLiveRegion="polite"
      >
        {formatAmount(data.balance, data.currency)}
      </Text>

      <View style={styles.metaRow}>
        <View
          accessibilityLabel={isLive ? 'Origen: en vivo' : 'Origen: caché'}
          style={[
            styles.badge,
            isLive ? styles.badgeLive : styles.badgeCache,
          ]}
        >
          <Text style={[styles.badgeDot, isLive ? styles.badgeDotLive : styles.badgeDotCache]}>
            ●
          </Text>
          <Text
            style={[
              styles.badgeLabel,
              isLive ? styles.badgeLabelLive : styles.badgeLabelCache,
            ]}
          >
            {isLive ? 'En vivo' : 'Caché'}
          </Text>
        </View>
        <Text style={styles.fetchedAt}>{formatDate(data.fetchedAt)}</Text>
      </View>
    </View>
  );
}