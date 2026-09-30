const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion

function randomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function randomCode(length: number, alphabet = ALPHABET): string {
  // Rejection sampling to avoid modulo bias.
  const max = 256 - (256 % alphabet.length);
  let out = '';
  while (out.length < length) {
    for (const b of randomBytes(length * 2)) {
      if (b < max && out.length < length) out += alphabet[b % alphabet.length];
    }
  }
  return out;
}

/** Human-friendly payment reference, e.g. "SS-7K3QX9". */
export function paymentReference(prefix = 'SS'): string {
  return `${prefix}-${randomCode(6)}`;
}

/** Unguessable token for capability links (subscriber confirm/unsubscribe). 160 bits. */
export function secureToken(): string {
  return Array.from(randomBytes(20), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Firestore-style id. */
export function autoId(): string {
  return randomCode(20, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
}

export function registrationId(uid: string, courseId: string): string {
  return `${uid}_${courseId}`;
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
