import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  initializeDatabase,
  addCredential,
  deleteCredential,
  updateCredential,
  getCredentialsByBank,
  getDefaultCredential,
  getAllCredentials,
} from '../services/credentialService';

type UserCredential = {
  id: number;
  bank_id: string;
  user_name: string;
  password: string;
  ci?: string;
  cedula?: string;
  is_default: boolean;
};

type CredentialContextType = {
  credentials: UserCredential[];
  allCredentials: UserCredential[];
  defaultCredential: UserCredential | null;
  selectedCredential: UserCredential | null;
  loading: boolean;
  setSelectedCredential: (cred: UserCredential | null) => void;
  addCredential: (
    bankId: string,
    userName: string,
    password: string,
    isDefault?: boolean,
    ci?: string,
    cedula?: string,
  ) => Promise<void>;
  deleteCredential: (id: number) => Promise<void>;
  updateCredential: (
    id: number,
    userName: string,
    password: string,
    isDefault?: boolean,
    ci?: string,
    cedula?: string,
  ) => Promise<void>;
  loadCredentialsByBank: (bankId: string) => Promise<void>;
  loadAllCredentials: () => Promise<void>;
};

const CredentialContext = createContext<CredentialContextType>({
  credentials: [],
  allCredentials: [],
  defaultCredential: null,
  selectedCredential: null,
  loading: true,
  setSelectedCredential: () => {},
  addCredential: async () => {},
  deleteCredential: async () => {},
  updateCredential: async () => {},
  loadCredentialsByBank: async () => {},
  loadAllCredentials: async () => {},
});

export const useCredential = () => useContext(CredentialContext);

export const CredentialProvider: React.ComponentType<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [credentials, setCredentials] = useState<UserCredential[]>([]);
  const [allCredentials, setAllCredentials] = useState<UserCredential[]>([]);
  const [defaultCredential, setDefaultCredential] = useState<UserCredential | null>(null);
  const [selectedCredential, setSelectedCredential] = useState<UserCredential | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await initializeDatabase();
        const allCreds = await getAllCredentials();
        setCredentials(allCreds);
        setAllCredentials(allCreds);

        const banks = [...new Set(allCreds.map((c) => c.bank_id))];
        for (const bank of banks) {
          const creds = await getCredentialsByBank(bank);
          setCredentials((prev) => {
            const filtered = prev.filter((c) => c.bank_id !== bank);
            return [...filtered, ...creds];
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Error initializing credentials:', error);
        setLoading(false);
      }
    })();
  }, []);

  const loadCredentialsByBank = useCallback(async (bankId: string) => {
    const creds = await getCredentialsByBank(bankId);
    setCredentials((prev) => {
      const filtered = prev.filter((c) => c.bank_id !== bankId);
      return [...filtered, ...creds];
    });
    const allCreds = await getAllCredentials();
    setAllCredentials(allCreds);
    const defaultCred = await getDefaultCredential(bankId);
    setDefaultCredential(defaultCred || null);
  }, []);

  const loadAllCredentials = useCallback(async () => {
    const allCreds = await getAllCredentials();
    setCredentials(allCreds);
    setAllCredentials(allCreds);
  }, []);

  return (
    <CredentialContext.Provider value={{
      credentials,
      allCredentials,
      defaultCredential,
      selectedCredential,
      loading,
      setSelectedCredential,
      addCredential,
      deleteCredential,
      updateCredential,
      loadCredentialsByBank,
      loadAllCredentials,
    }}>
      {children}
    </CredentialContext.Provider>
  );
};
