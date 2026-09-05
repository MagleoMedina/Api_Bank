import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BalanceCard } from '../components/BalanceCard/BalanceCard';
import { BalanceCardSkeleton } from '../components/BalanceCard/BalanceCard.skeleton';
import { Button } from '../components/Button/Button';
import { Header } from '../components/Header/Header';
import { EmptyState } from '../components/state-views/EmptyState';
import { ErrorState } from '../components/state-views/ErrorState';
import { useBalance } from '../hooks/useBalance';
import { useTheme } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/theme';

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
    },
    page: {
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      padding: 24,
      gap: 20,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      flex: 1,
    },
    inlineError: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.dangerSurface,
      borderColor: colors.dangerBorder,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    inlineErrorText: {
      flex: 1,
      fontSize: 13,
      color: colors.ink,
    },
    dismissButton: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.dangerBorder,
    },
    dismissGlyph: {
      fontSize: 14,
      color: colors.danger,
    },
    dismissPressed: {
      opacity: 0.7,
    },
  });
}

export function HomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    balance,
    error,
    isLoading,
    isRefreshing,
    activeBank,
    loadBank,
    refresh,
    clearError,
  } = useBalance();

  const hasBalance = balance !== null;
  const isLoadingFirstLoad = isLoading && !hasBalance;

  const renderBody = () => {
    if (isLoadingFirstLoad) {
      return <BalanceCardSkeleton />;
    }

    if (!hasBalance && error) {
      return (
        <ErrorState message={error} onRetry={() => loadBank(activeBank ?? 'mock')} />
      );
    }

    if (hasBalance) {
      return (
        <>
          {error ? (
            <View style={styles.inlineError} accessibilityRole="alert">
              <Text style={styles.inlineErrorText} numberOfLines={2}>
                No se pudo actualizar: {error}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Descartar aviso"
                onPress={clearError}
                style={({ pressed }) => [
                  styles.dismissButton,
                  pressed && styles.dismissPressed,
                ]}
              >
                <Text style={styles.dismissGlyph}>✕</Text>
              </Pressable>
            </View>
          ) : null}
          <BalanceCard
            data={balance}
            isRefreshing={isRefreshing}
            onRefresh={refresh}
          />
        </>
      );
    }

    return (
      <EmptyState
        message="Selecciona un banco para consultar tu saldo"
        hint="Puedes probar con el modo de prueba sin entrar al portal del banco."
      />
    );
  };

  return (
    <ScrollView
      style={styles.scrollContent}
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <Header
        title="Multibank"
        subtitle="Consulta tu saldo multibancario"
      />
      {renderBody()}
      <View style={styles.actions}>
        <Button
          label="Saldo BDV"
          variant="primary"
          onPress={() => loadBank('bdv')}
          disabled={isLoading}
          style={styles.actionButton}
          accessibilityLabel="Consultar saldo Banco de Venezuela"
        />
        <Button
          label="Saldo de prueba"
          onPress={() => loadBank('mock')}
          disabled={isLoading}
          style={styles.actionButton}
          accessibilityLabel="Consultar saldo de prueba"
        />
      </View>
    </ScrollView>
  );
}