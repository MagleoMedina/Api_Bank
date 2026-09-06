import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BalanceCard } from '../components/BalanceCard/BalanceCard';
import { BalanceCardSkeleton } from '../components/BalanceCard/BalanceCard.skeleton';
import { Button } from '../components/Button/Button';
import { Header } from '../components/Header/Header';
import { EmptyState } from '../components/state-views/EmptyState';
import { ErrorState } from '../components/state-views/ErrorState';
import { UserPickerModal } from '../components/UserPickerModal/UserPickerModal';
import { useBalance } from '../hooks/useBalance';
import { useTheme } from '../theme/ThemeProvider';
import { useCredential } from '../contexts/CredentialContext';
import { checkServerHealth } from '../services/healthService';
import { apiService } from '../services/apiService';
import type { ThemeColors } from '../theme/theme';
import type { AccountBalance } from '../api/api';

type Props = {
  onNavigateToCredentials?: (bank?: string) => void;
};

const BANKS = [
  { id: 'bdv', label: 'Saldo BDV', ariaLabel: 'Consultar saldo Banco de Venezuela' },
  { id: 'bnc', label: 'Saldo BNC', ariaLabel: 'Consultar saldo Banco Nacional de Crédito' },
  { id: 'vol', label: 'Saldo VOL', ariaLabel: 'Consultar saldo Venezolano de Crédito' },
  { id: 'bdt', label: 'Saldo BDT', ariaLabel: 'Consultar saldo Banco del Tesoro' },
  { id: 'bfc', label: 'Saldo BFC', ariaLabel: 'Consultar saldo Fondo Común' },
];

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
      flexWrap: 'wrap',
      gap: 12,
    },
    actionButton: {
      flex: 1,
      minWidth: 124,
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
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 4,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '500',
    },
  });
}

export function HomeScreen({ onNavigateToCredentials }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { allCredentials } = useCredential();
  const {
    balance,
    error,
    isLoading,
    isRefreshing,
    loadBank,
    refresh,
    clearError,
    setBalanceDirectly,
  } = useBalance();

  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const [querying, setQuerying] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  useEffect(() => {
    checkServerHealth().then((s) => setServerOk(s.server));
    const interval = setInterval(async () => {
      const s = await checkServerHealth();
      setServerOk(s.server);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleBankPress = (bankId: string) => {
    const bankCreds = allCredentials.filter((c) => c.bank_id === bankId);
    if (bankCreds.length === 0) {
      onNavigateToCredentials?.(bankId);
      return;
    }
    setSelectedBank(bankId);
    setPickerError(null);
    setPickerVisible(true);
  };

  const handleUserSelect = async (credential: any) => {
    setPickerVisible(false);
    setQuerying(true);
    setPickerError(null);
    try {
      const response = await apiService.postBalance({
        bank: credential.bank_id,
        user: credential.user_name,
        password: credential.password,
        cedula: credential.cedula,
        ci: credential.ci,
      });

      if (response.error) {
        setPickerError(response.error);
        return;
      }

      const balanceData: AccountBalance = {
        bankId: response.bankId ?? credential.bank_id,
        account: response.account ?? '',
        balance: response.balance ?? 0,
        currency: response.currency ?? 'VES',
        fetchedAt: new Date(response.fetchedAt ?? Date.now()).toISOString(),
        source: 'live',
        userName: credential.user_name,
      };
      setBalanceDirectly(balanceData);
    } catch {
      setPickerError('No se pudo consultar el saldo');
    } finally {
      setQuerying(false);
    }
  };

  const hasBalance = balance !== null;
  const isLoadingFirstLoad = isLoading && !hasBalance;

  const renderBody = () => {
    if (querying) {
      return <BalanceCardSkeleton />;
    }

    if (isLoadingFirstLoad) {
      return <BalanceCardSkeleton />;
    }

    if (pickerError) {
      return (
        <ErrorState message={pickerError} onRetry={() => setPickerError(null)} />
      );
    }

    if (!hasBalance && error) {
      return (
        <ErrorState message={error} onRetry={() => loadBank('mock')} />
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

      <View style={[styles.statusBar, { backgroundColor: serverOk === true ? '#dcfce7' : serverOk === false ? '#fef2f2' : '#f3f4f6' }]}>
        <View style={[styles.statusDot, { backgroundColor: serverOk === true ? '#22c55e' : serverOk === false ? '#ef4444' : '#9ca3af' }]} />
        <Text style={[styles.statusText, { color: serverOk === true ? '#166534' : serverOk === false ? '#991b1b' : '#6b7280' }]}>
          {serverOk === true ? 'Servidor activo' : serverOk === false ? 'Servidor inactivo' : 'Verificando...'}
        </Text>
      </View>

      {renderBody()}

      <View style={styles.actions}>
        {BANKS.map((bank) => (
          <Button
            key={bank.id}
            label={bank.label}
            variant="primary"
            onPress={() => handleBankPress(bank.id)}
            disabled={isLoading || querying}
            style={styles.actionButton}
            accessibilityLabel={bank.ariaLabel}
          />
        ))}
        <Button
          label="Saldo de prueba"
          onPress={() => loadBank('mock')}
          disabled={isLoading || querying}
          style={styles.actionButton}
          accessibilityLabel="Consultar saldo de prueba"
        />
      </View>

      <View style={styles.actions}>
        <Button
          label="Gestionar Credenciales"
          variant="secondary"
          onPress={() => onNavigateToCredentials?.()}
          style={styles.actionButton}
          accessibilityLabel="Gestionar credenciales bancarias"
        />
      </View>

      <UserPickerModal
        visible={pickerVisible}
        bank={selectedBank}
        credentials={allCredentials}
        onSelect={handleUserSelect}
        onClose={() => setPickerVisible(false)}
        onManage={() => {
          setPickerVisible(false);
          onNavigateToCredentials?.(selectedBank);
        }}
      />
    </ScrollView>
  );
}
