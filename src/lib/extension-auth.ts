import { createHash, randomBytes } from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';

/* ──────────────────────────────────────────────────────────────────────────
   Extension key auth — used by /api/extension/* routes.

   Keys look like: frsk_<32 chars of base32-ish hex>
   Stored as SHA-256 hash in the database (the same way GitHub stores PATs).
   The prefix (first 12 chars including the frsk_ marker) is kept in plain
   so users can identify their own keys in the account page without us ever
   having to display or re-derive the secret.
   ────────────────────────────────────────────────────────────────────────── */

const KEY_PREFIX = 'frsk_';
const KEY_RANDOM_BYTES = 24; // → 48 hex chars; full key length: ~53 chars

/** Generate a new plaintext key. Show this to the user ONCE. */
export function generateExtensionKey(): string {
  return KEY_PREFIX + randomBytes(KEY_RANDOM_BYTES).toString('hex');
}

/** SHA-256 hash of the plaintext key. Stored in the database. */
export function hashExtensionKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

/** First 12 chars for UI display (includes 'frsk_' marker). */
export function extensionKeyPrefix(plaintext: string): string {
  return plaintext.slice(0, 12);
}

export type ExtensionAuthSuccess = {
  ok: true;
  userId: string;
  keyId: string;
};
export type ExtensionAuthFailure = {
  ok: false;
  status: 401 | 403;
  message: string;
};
export type ExtensionAuthResult = ExtensionAuthSuccess | ExtensionAuthFailure;

/**
 * Reads the Authorization header from an extension request and validates
 * the key. On success, returns the user id and key id (caller should
 * update lastUsedAt asynchronously). On failure, returns a structured
 * error the caller can convert to a 401/403 response.
 *
 * Caller pattern:
 *   const auth = await authenticateExtensionRequest(req);
 *   if (!auth.ok) {
 *     return NextResponse.json({ error: auth.message }, { status: auth.status });
 *   }
 *   // use auth.userId
 */
export async function authenticateExtensionRequest(
  req: NextRequest
): Promise<ExtensionAuthResult> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader) {
    return { ok: false, status: 401, message: 'Missing Authorization header' };
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { ok: false, status: 401, message: 'Invalid Authorization header format — expected Bearer token' };
  }

  const plaintext = match[1].trim();
  if (!plaintext.startsWith(KEY_PREFIX)) {
    return { ok: false, status: 401, message: 'Invalid extension key format' };
  }

  const hash = hashExtensionKey(plaintext);
  const key = await prisma.extensionKey.findUnique({
    where: { hash },
    select: { id: true, userId: true, revokedAt: true },
  });

  if (!key) {
    return { ok: false, status: 401, message: 'Extension key not recognised' };
  }
  if (key.revokedAt) {
    return { ok: false, status: 403, message: 'Extension key has been revoked' };
  }

  // Update lastUsedAt non-blockingly — the request itself doesn't wait on this.
  prisma.extensionKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => { /* don't fail the request if last-used logging fails */ });

  return { ok: true, userId: key.userId, keyId: key.id };
}
