import React from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { getUserLabel, BANK_NAMES } from '../../types';

type UserCredential = {
  id: number;
  bank_id: string;
  user_name: string;
  password: string;
  ci?: string;
  cedula?: string;
  is_default: boolean;
};

type Props = {
  visible: boolean;
  bank: string;
  credentials: UserCredential[];
  onSelect: (credential: UserCredential) => void;
  onClose: () => void;
  onManage: () => void;
};

export function UserPickerModal({ visible, bank, credentials, onSelect, onClose, onManage }: Props) {
  const bankCreds = credentials.filter((c) => c.bank_id === bank);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            Seleccionar usuario - {BANK_NAMES[bank] ?? bank.toUpperCase()}
          </Text>

          {bankCreds.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay usuarios guardados</Text>
              <Pressable style={styles.manageBtn} onPress={onManage}>
                <Text style={styles.manageBtnText}>Agregar usuario</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={bankCreds}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.userRow, item.is_default && styles.userRowDefault]}
                  onPress={() => onSelect(item)}
                >
                  <View style={styles.userInfo}>
                    <Text style={styles.userLabel}>{getUserLabel(item)}</Text>
                    <Text style={styles.userDetail}>{item.user_name}</Text>
                    {item.is_default && (
                      <Text style={styles.defaultBadge}>★ Default</Text>
                    )}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              )}
            />
          )}

          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </Pressable>
            {bankCreds.length > 0 && (
              <Pressable style={styles.manageBtn} onPress={onManage}>
                <Text style={styles.manageBtnText}>Gestionar</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  userRowDefault: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  userInfo: {
    flex: 1,
  },
  userLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  userDetail: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  defaultBadge: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: '#9ca3af',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  manageBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  manageBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
});
