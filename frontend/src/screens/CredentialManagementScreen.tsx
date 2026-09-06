import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  Alert,
  FlatList,
  Modal,
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useCredential } from '../contexts/CredentialContext';
import { getUserLabel, BANK_NAMES } from '../types';

type Props = {
  bank: string;
  onBack?: () => void;
};

export const CredentialManagementScreen = ({ bank, onBack }: Props) => {
  const {
    allCredentials,
    addCredential,
    deleteCredential,
    updateCredential,
    loadCredentialsByBank,
    setSelectedCredential,
  } = useCredential();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newCi, setNewCi] = useState('');
  const [newCedula, setNewCedula] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadCredentialsByBank(bank);
  }, [bank, loadCredentialsByBank]);

  const needsCi = bank === 'bnc';
  const needsCedula = bank === 'bdt';

  const handleAdd = async () => {
    if (!newUser || !newPass) {
      Alert.alert('Error', 'Usuario y contraseña son requeridos');
      return;
    }
    if (needsCi && !newCi) {
      Alert.alert('Error', 'CI es requerida para BNC');
      return;
    }
    if (needsCedula && !newCedula) {
      Alert.alert('Error', 'Cédula es requerida para BDT');
      return;
    }
    try {
      await addCredential(bank, newUser, newPass, isDefault, newCi || undefined, newCedula || undefined);
      setNewUser('');
      setNewPass('');
      setNewCi('');
      setNewCedula('');
      setIsDefault(false);
      Alert.alert('Éxito', 'Usuario agregado correctamente');
      await loadCredentialsByBank(bank);
    } catch {
      Alert.alert('Error', 'No se pudo agregar el usuario');
    }
  };

  const handleDelete = (id: number, userName: string) => {
    Alert.alert(
      'Confirmar',
      `¿Eliminar usuario ${userName} permanentemente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteCredential(id);
            Alert.alert('Éxito', 'Usuario eliminado');
            await loadCredentialsByBank(bank);
          },
        },
      ]
    );
  };

  const handleUpdate = async () => {
    if (!newUser || !newPass || editingId === null) {
      Alert.alert('Error', 'Campos requeridos');
      return;
    }
    try {
      await updateCredential(editingId, newUser, newPass, isDefault, newCi || undefined, newCedula || undefined);
      Alert.alert('Éxito', 'Credencial actualizada');
      setEditingId(null);
      setNewUser('');
      setNewPass('');
      setNewCi('');
      setNewCedula('');
      setIsDefault(false);
      setShowModal(false);
      await loadCredentialsByBank(bank);
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la credencial');
    }
  };

  const startEdit = (cred: any) => {
    setEditingId(cred.id);
    setNewUser(cred.user_name);
    setNewPass(cred.password);
    setNewCi(cred.ci ?? '');
    setNewCedula(cred.cedula ?? '');
    setIsDefault(Boolean(cred.is_default));
    setShowModal(true);
  };

  const bankCreds = allCredentials.filter((c) => c.bank_id === bank);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Credenciales - {BANK_NAMES[bank] ?? bank.toUpperCase()}</Text>

      <FlatList
        data={bankCreds}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.userItem}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{getUserLabel(item)}</Text>
              <Text style={styles.userDetail}>{item.user_name}</Text>
              {item.is_default ? (
                <Text style={styles.isDefaultText}>★ Default</Text>
              ) : null}
            </View>
            <View style={styles.userActions}>
              <Pressable
                style={styles.actionBtn}
                onPress={() => {
                  setSelectedCredential(item);
                  Alert.alert('Seleccionado', `Ahora usarás ${getUserLabel(item)} para consultar`);
                }}
              >
                <Text style={styles.actionBtnText}>Usar</Text>
              </Pressable>
              <Pressable
                style={styles.actionBtn}
                onPress={() => startEdit(item)}
              >
                <Text style={styles.actionBtnText}>Editar</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleDelete(item.id, getUserLabel(item))}
              >
                <Text style={[styles.actionBtnText, styles.deleteBtnText]}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No hay usuarios guardados para este banco
          </Text>
        }
      />

      {/* Modal Editar */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Editar Credencial</Text>
            <TextInput
              placeholder="Usuario"
              value={newUser}
              onChangeText={setNewUser}
              style={styles.input}
            />
            <TextInput
              placeholder="Contraseña"
              value={newPass}
              onChangeText={setNewPass}
              secureTextEntry
              style={styles.input}
            />
            {needsCi && (
              <TextInput
                placeholder="CI (cédula)"
                value={newCi}
                onChangeText={setNewCi}
                style={styles.input}
                keyboardType="numeric"
              />
            )}
            {needsCedula && (
              <TextInput
                placeholder="Cédula"
                value={newCedula}
                onChangeText={setNewCedula}
                style={styles.input}
                keyboardType="numeric"
              />
            )}
            <Pressable
              style={styles.checkboxRow}
              onPress={() => setIsDefault(!isDefault)}
            >
              <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
                {isDefault ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.checkboxLabel}>Por defecto</Text>
            </Pressable>
            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                onPress={() => {
                  setShowModal(false);
                  setEditingId(null);
                  setNewUser('');
                  setNewPass('');
                  setNewCi('');
                  setNewCedula('');
                  setIsDefault(false);
                }}
              />
              <Button title="Actualizar" onPress={handleUpdate} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Formulario Agregar */}
      <View style={styles.formSection}>
        <Text style={styles.formTitle}>Agregar nuevo usuario</Text>
        <TextInput
          placeholder="Usuario"
          value={newUser}
          onChangeText={setNewUser}
          style={styles.input}
        />
        <TextInput
          placeholder="Contraseña"
          value={newPass}
          onChangeText={setNewPass}
          secureTextEntry
          style={styles.input}
        />
        {needsCi && (
          <TextInput
            placeholder="CI (cédula)"
            value={newCi}
            onChangeText={setNewCi}
            style={styles.input}
            keyboardType="numeric"
          />
        )}
        {needsCedula && (
          <TextInput
            placeholder="Cédula"
            value={newCedula}
            onChangeText={setNewCedula}
            style={styles.input}
            keyboardType="numeric"
          />
        )}
        <Pressable
          style={styles.checkboxRow}
          onPress={() => setIsDefault(!isDefault)}
        >
          <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
            {isDefault ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.checkboxLabel}>Por defecto</Text>
        </Pressable>
        <Button title="Agregar usuario" onPress={handleAdd} />
      </View>

      {onBack && (
        <View style={styles.backSection}>
          <Button title="Volver" onPress={onBack} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '500' },
  userDetail: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  isDefaultText: { color: '#059669', fontSize: 12, marginTop: 2 },
  userActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
  },
  actionBtnText: { fontSize: 12, fontWeight: '500' },
  deleteBtn: { backgroundColor: '#fecaca' },
  deleteBtnText: { color: '#dc2626' },
  emptyText: { color: '#6b7280', fontStyle: 'italic', marginTop: 10 },
  formSection: { marginTop: 20 },
  formTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    height: 40,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: { color: '#fff', fontSize: 12 },
  checkboxLabel: { fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 10,
  },
  backSection: { marginTop: 20 },
});
