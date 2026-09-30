import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/config/env';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export function firebase(): { app: FirebaseApp; db: Firestore; auth: Auth } {
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
    try {
      // Offline-friendly: IndexedDB cache shared across tabs (also saves reads on revisits).
      db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
    } catch {
      db = initializeFirestore(app, {});
    }
    auth = getAuth(app);
  }
  return { app, db: db as Firestore, auth: auth as Auth };
}
