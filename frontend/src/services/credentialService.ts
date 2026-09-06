import * as SQLite from 'expo-sqlite';
import type { UserCredential } from '../types';

const db = SQLite.openDatabaseSync('credenciales.db');

interface SQLiteCredential {
  id: number;
  bank_id: string;
  user_name: string;
  password: string;
  ci: string | null;
  cedula: string | null;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export async function initializeDatabase(): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      password TEXT NOT NULL,
      ci TEXT,
      cedula TEXT,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function addCredential(
  bankId: string,
  userName: string,
  password: string,
  isDefault: boolean = false,
  ci?: string,
  cedula?: string,
): Promise<void> {
  if (isDefault) {
    await db.runAsync(
      `UPDATE user_credentials SET is_default = 0 WHERE bank_id = ?`,
      [bankId]
    );
  }
  await db.runAsync(
    `INSERT INTO user_credentials (bank_id, user_name, password, ci, cedula, is_default) VALUES (?, ?, ?, ?, ?, ?)`,
    [bankId, userName, password, ci ?? null, cedula ?? null, isDefault ? 1 : 0]
  );
}

export async function deleteCredential(id: number): Promise<void> {
  await db.runAsync(`DELETE FROM user_credentials WHERE id = ?`, [id]);
}

export async function updateCredential(
  id: number,
  userName: string,
  password: string,
  isDefault: boolean = false,
  ci?: string,
  cedula?: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE user_credentials SET user_name = ?, password = ?, ci = ?, cedula = ?, is_default = ? WHERE id = ?`,
    [userName, password, ci ?? null, cedula ?? null, isDefault ? 1 : 0, id]
  );
}

function toUserCredential(row: SQLiteCredential): UserCredential {
  return {
    id: row.id,
    bank_id: row.bank_id,
    user_name: row.user_name,
    password: row.password,
    is_default: Boolean(row.is_default),
    ci: row.ci ?? undefined,
    cedula: row.cedula ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getCredentialsByBank(bankId: string): Promise<UserCredential[]> {
  const rows = await db.getAllAsync<SQLiteCredential>(
    `SELECT * FROM user_credentials WHERE bank_id = ? ORDER BY is_default DESC, user_name`,
    [bankId]
  );
  return rows.map(toUserCredential);
}

export async function getDefaultCredential(bankId: string): Promise<UserCredential | null> {
  const creds = await getCredentialsByBank(bankId);
  return creds.find(c => c.is_default) || null;
}

export async function getAllCredentials(): Promise<UserCredential[]> {
  const rows = await db.getAllAsync<SQLiteCredential>(
    `SELECT * FROM user_credentials ORDER BY bank_id, is_default DESC, user_name`
  );
  return rows.map(toUserCredential);
}
