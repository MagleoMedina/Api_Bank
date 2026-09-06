import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useCredential } from '../contexts/CredentialContext';
import { apiService } from '../services/apiService';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  bank: string;
  onNavigateToCredentials?: () => void;
};

export const BalanceScreen = ({ bank, onNavigateToCredentials }: Props) => {
  const { colors } = useTheme();
  const { credentials, selectedCredential, loading, loadCredentialsByBank } =
    useCredential();
  const [balanceData, setBalanceData] = useState<any>(null);
  const [consulting, setConsulting] = useState(false);

  useEffect(() => {
    loadCredentialsByBank(bank);
  }, [bank, loadCredentialsByBank]);

  const consultarSaldo = async () => {
    const credential =
      selectedCredential ||
      credentials.find((c) => c.is_default) ||
      (credentials.length > 0 ? credentials[0] : null);

    if (!credential) {
      Alert.alert('Error', 'No hay credenciales guardadas para este banco');
      return;
    }

    setConsulting(true);
    try {
      const response = await apiService.postBalance({
        bank,
        user: credential.user_name,
        password: credential.password,
      });

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      setBalanceData({ ...response, user: credential.user_name });
    } catch {
      Alert.alert('Error', 'No se pudo consultar el saldo');
    } finally {
      setConsulting(false);
    }
  };

  const usuarioActual =
    selectedCredential ||
    credentials.find((c) => c.is_default) ||
    credentials[0] ||
    null;

  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { color: colors.primary }]}>Banco: {bank.toUpperCase()}</Text>

      {loading ? (
        <Text style={{ color: colors.ink }}>Cargando credenciales...</Text>
      ) : credentials.length === 0 ? (
        <View>
          <Text style={{ color: colors.ink }}>
            No hay credenciales guardadas para este banco.
          </Text>
          <Button
            title="Agregar credenciales"
            onPress={onNavigateToCredentials || (() => {})}
          />
        </View>
      ) : (
        <View>
          {credentials.length > 1 ? (
            <Text style={{ color: colors.ink }}>
              Usuarios disponibles:{' '}
              {credentials
                .map((c) => c.user_name + (c.is_default ? ' ★' : ''))
                .join(', ')}
            </Text>
          ) : (
            <Text style={{ color: colors.ink }}>
              Usuario actual: {usuarioActual?.user_name || 'Ninguno'}
            </Text>
          )}

          <Button
            title={consulting ? 'Consultando...' : 'Consultar Saldo'}
            onPress={consultarSaldo}
            disabled={!usuarioActual || consulting}
          />
          <Button
            title="Gestionar Credenciales"
            onPress={onNavigateToCredentials || (() => {})}
          />
        </View>
      )}

      {balanceData && (
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo disponible</Text>
          <Text style={styles.balanceAmount}>
            {Number(balanceData.balance)
              .toFixed(2)
              .replace('.', ',')}{' '}
            {balanceData.currency}
          </Text>
          <Text style={styles.balanceUser}>({balanceData.user})</Text>
          <Text style={styles.balanceAccount}>{balanceData.account}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  balanceCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 14,
    backgroundColor: '#f0f4f8',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  balanceLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' },
  balanceAmount: { fontSize: 32, fontWeight: '700', color: '#111827', marginTop: 4 },
  balanceUser: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  balanceAccount: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
});
