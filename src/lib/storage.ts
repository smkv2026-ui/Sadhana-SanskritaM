/**
 * Web Storage helpers that never throw (private mode, blocked site data, sandboxed previews).
 */
type Area = 'local' | 'session';

function area(kind: Area): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readStorage(kind: Area, key: string): string | null {
  try {
    return area(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorage(kind: Area, key: string, value: string): void {
  try {
    area(kind)?.setItem(key, value);
  } catch {
    /* storage unavailable — feature silently degrades */
  }
}

export function removeStorage(kind: Area, key: string): void {
  try {
    area(kind)?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readJson<T>(kind: Area, key: string, fallback: T): T {
  const raw = readStorage(kind, key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(kind: Area, key: string, value: unknown): void {
  writeStorage(kind, key, JSON.stringify(value));
}

export const STORAGE_KEYS = {
  introSeen: 'ss.introSeen',
  theme: 'ss.theme',
  sound: 'ss.sound',
  script: 'ss.script',
  demoDb: 'ss.demo.db.v1',
  demoAuth: 'ss.demo.auth.v1',
  emailForSignIn: 'ss.emailForSignIn',
  finder: 'ss.finder',
  customDraft: 'ss.customDraft',
} as const;
