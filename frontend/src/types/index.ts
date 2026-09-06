export interface UserCredential {
  id: number;
  bank_id: string;
  user_name: string;
  password: string;
  ci?: string;
  cedula?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const BANK_DISPLAY_FIELDS: Record<string, string> = {
  bdv: 'user_name',
  bnc: 'ci',
  vol: 'user_name',
  bdt: 'cedula',
  bfc: 'user_name',
};

export const BANK_NAMES: Record<string, string> = {
  bdv: 'Banco de Venezuela',
  bnc: 'Banco Nacional de Crédito',
  vol: 'Venezolano de Crédito',
  bdt: 'Banco del Tesoro',
  bfc: 'Fondo Común',
};

export function getUserLabel(credential: UserCredential): string {
  const field = BANK_DISPLAY_FIELDS[credential.bank_id] ?? 'user_name';
  const value = (credential as Record<string, unknown>)[field];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return credential.user_name;
}
