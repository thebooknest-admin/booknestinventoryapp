import crypto from 'crypto';

// Keep this in sync with src/proxy.ts and src/app/api/auth/*
const COOKIE_NAME = 'bn_ops_session';

function base64urlToBuffer(input: string) {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

function base64url(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sign(payloadB64: string, secret: string) {
  return base64url(crypto.createHmac('sha256', secret).update(payloadB64).digest());
}

function timingSafeEqualStr(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export type SessionPayload = {
  u?: string;
  exp: number;
};

/**
 * Returns the username (payload.u) if the session cookie is valid, otherwise null.
 */
export function getSessionUser(cookieValue?: string): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  if (!cookieValue) return null;

  const parts = cookieValue.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sig] = parts;
  const expected = sign(payloadB64, secret);
  if (!timingSafeEqualStr(sig, expected)) return null;

  try {
    const payloadJson = base64urlToBuffer(payloadB64).toString('utf8');
    const payload = JSON.parse(payloadJson) as SessionPayload;
    if (!payload?.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload.u ?? null;
  } catch {
    return null;
  }
}

/** Convenience helper in case you ever want the cookie name in UI. */
export function getSessionCookieName() {
  return COOKIE_NAME;
}
