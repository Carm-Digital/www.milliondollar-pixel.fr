/** Cookie + HMAC pour la porte d’accès /admin (Edge + Node). */

export const ADMIN_GATE_COOKIE = 'mdp_admin_gate';

const PAYLOAD = 'admin-gate-v1';

function encoder() {
  return new TextEncoder();
}

export async function createAdminGateToken(secret: string): Promise<string> {
  const enc = encoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(PAYLOAD));
  return bufferToHex(new Uint8Array(sig));
}

function bufferToHex(buf: Uint8Array): string {
  let s = '';
  for (let i = 0; i < buf.length; i++) {
    s += buf[i]!.toString(16).padStart(2, '0');
  }
  return s;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function verifyAdminGateToken(
  secret: string,
  cookieValue: string | undefined
): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await createAdminGateToken(secret);
  return timingSafeEqualHex(cookieValue, expected);
}

export function adminGateSecret(): string | undefined {
  const pwd = process.env.ADMIN_ACCESS_PASSWORD?.trim();
  if (!pwd) return undefined;
  return process.env.ADMIN_GATE_SECRET?.trim() || pwd;
}
