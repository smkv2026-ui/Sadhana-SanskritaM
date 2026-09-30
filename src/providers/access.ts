import { env } from '@/config/env';
import { backend, BackendError } from '@/data';
import type { CourseSecrets, Recording } from '@/data/types';

/**
 * AccessProvider — how paid content (live links, recordings) is delivered.
 *
 * Now: FirestoreRulesAccessProvider — `courseSecrets/{courseId}` is readable only by admins and
 * learners whose registration is APPROVED; the rules are the gate (proved by CI tests).
 * Later: SignedUrlAccessProvider — short-lived signed URLs minted by a server (e.g. for
 * Cloud Storage / a video CDN) so recording URLs are never stored in Firestore.
 */
export type AccessResult = { granted: true; secrets: CourseSecrets } | { granted: false; reason: string };

export interface AccessProvider {
  readonly id: 'firestore-rules' | 'signed-url';
  getAccess(courseId: string): Promise<AccessResult>;
  resolveRecordingUrl(recording: Recording): Promise<string>;
}

export class FirestoreRulesAccessProvider implements AccessProvider {
  readonly id = 'firestore-rules' as const;

  async getAccess(courseId: string): Promise<AccessResult> {
    try {
      const secrets = await (await backend()).getCourseSecrets(courseId);
      if (!secrets) return { granted: false, reason: 'Content is being prepared — check back soon.' };
      return { granted: true, secrets };
    } catch (err) {
      if (err instanceof BackendError && err.code === 'permission-denied') {
        return { granted: false, reason: 'Access unlocks as soon as your payment is verified.' };
      }
      return { granted: false, reason: 'Could not load your content. Please retry.' };
    }
  }

  async resolveRecordingUrl(recording: Recording): Promise<string> {
    return recording.url;
  }
}

export class SignedUrlAccessProvider implements AccessProvider {
  readonly id = 'signed-url' as const;
  async getAccess(courseId: string): Promise<AccessResult> {
    return new FirestoreRulesAccessProvider().getAccess(courseId);
  }
  async resolveRecordingUrl(): Promise<string> {
    throw new Error('SignedUrlAccessProvider is a stub: add a server endpoint that returns short-lived URLs.');
  }
}

let instance: AccessProvider | null = null;
export function getAccessProvider(): AccessProvider {
  instance ??= env.providers.access === 'signed-url' ? new SignedUrlAccessProvider() : new FirestoreRulesAccessProvider();
  return instance;
}
