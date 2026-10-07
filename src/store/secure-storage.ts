import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Keychain / Keystore-backed storage for auth tokens. SecureStore has no web
 * implementation, so web keeps tokens in memory only (session lasts one tab).
 */
const memory = new Map<string, string>();
const useMemory = Platform.OS === 'web';

export async function getSecure(key: string): Promise<string | null> {
  if (useMemory) return memory.get(key) ?? null;
  return SecureStore.getItemAsync(key);
}

export async function setSecure(key: string, value: string): Promise<void> {
  if (useMemory) {
    memory.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecure(key: string): Promise<void> {
  if (useMemory) {
    memory.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
