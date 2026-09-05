import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  getBalance,
  type AccountBalance,
  type BankId,
} from './src/api/api';

export default function App() {
  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (bank: BankId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBalance(bank);
      setBalance(result);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Error desconocido',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" />
        <Text style={styles.title}>Multibank</Text>
        <Text style={styles.subtitle}>Consulta tu saldo del backend NestJS</Text>

        {balance ? (
          <View style={styles.card}>
            <Text style={styles.cardBank}>{balance.bankId.toUpperCase()}</Text>
            <Text style={styles.cardAccount}>{balance.account}</Text>
            <Text style={styles.cardBalance}>
              {balance.balance.toLocaleString('es-VE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              {balance.currency}
            </Text>
            <Text style={styles.cardMeta}>
              Origen: {balance.source === 'live' ? 'en vivo' : 'caché'} ·{' '}
              {new Date(balance.fetchedAt).toLocaleString('es-VE')}
            </Text>
            {balance.accountType ? (
              <Text style={styles.cardMeta}>Cuenta {balance.accountType}</Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.empty}>Aún no has consultado ningún saldo.</Text>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>No se pudo consultar el saldo</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        ) : null}

        {loading ? <ActivityIndicator size="large" /> : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.buttonPrimary,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => load('bdv')}
          disabled={loading}
        >
          <Text style={styles.buttonLabelPrimary}>Consultar saldo BDV</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => load('mock')}
          disabled={loading}
        >
          <Text style={styles.buttonLabel}>Saldo de prueba (mock)</Text>
        </Pressable>
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  content: {
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderColor: '#e2e2e2',
    borderWidth: 1,
    gap: 4,
  },
  cardBank: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f4cba',
    letterSpacing: 1,
  },
  cardAccount: {
    fontSize: 14,
    color: '#444',
  },
  cardBalance: {
    fontSize: 30,
    fontWeight: '700',
    color: '#131418',
  },
  cardMeta: {
    fontSize: 13,
    color: '#777',
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: '#fdecea',
    borderColor: '#e2b6b0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  errorTitle: {
    color: '#a33',
    fontWeight: '600',
    fontSize: 15,
  },
  errorMessage: {
    color: '#8a5550',
    fontSize: 13,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#eceff4',
  },
  buttonPrimary: {
    backgroundColor: '#0f4cba',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonLabel: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonLabelPrimary: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});