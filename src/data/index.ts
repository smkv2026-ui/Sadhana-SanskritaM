import { env } from '@/config/env';
import type { Backend } from './backend';
import { DemoBackend } from './demo/demoBackend';

let promise: Promise<Backend> | null = null;

/**
 * Lazily resolves the configured backend. The Firebase SDK is only downloaded when Firebase
 * is configured, so the demo build stays light.
 */
export function backend(): Promise<Backend> {
  promise ??=
    env.backend === 'firebase'
      ? import('./firebase/firestoreBackend').then((m) => new m.FirestoreBackend() as Backend)
      : Promise.resolve(new DemoBackend());
  return promise;
}

/** Tests can inject a backend. */
export function setBackendForTests(b: Backend): void {
  promise = Promise.resolve(b);
}

export type { Backend } from './backend';
export { BackendError } from './backend';
