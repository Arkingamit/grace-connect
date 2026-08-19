import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_for_dev_only';
const encodedKey = new TextEncoder().encode(secretKey);

function validateSecret() {
  if (process.env.NODE_ENV === 'production' && secretKey === 'fallback_secret_key_for_dev_only') {
    throw new Error('FATAL: JWT_SECRET is not set in production environment');
  }
}

export async function encrypt(payload: any) {
  validateSecret();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = '') {
  validateSecret();
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export interface SessionCookie {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    expires: Date;
    sameSite: 'lax';
    path: string;
  };
}

/**
 * Build the session cookie without setting it, for handlers that attach it to a
 * response they construct themselves (e.g. an OAuth callback redirect).
 */
export async function buildSessionCookie(
  userId: string,
  email: string,
  name: string,
  role: string = 'member',
  permissions: string[] = [],
): Promise<SessionCookie> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await encrypt({ userId, email, name, role, permissions, expiresAt });

  return {
    name: 'session',
    value: session,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      sameSite: 'lax',
      path: '/',
    },
  };
}

/** Create a session cookie embedding userId, email, name, role AND permissions (avoids DB lookup on every request) */
export async function createSession(userId: string, email: string, name: string, role: string = 'member', permissions: string[] = []) {
  const cookie = await buildSessionCookie(userId, email, name, role, permissions);
  (await cookies()).set(cookie.name, cookie.value, cookie.options);
}

export async function deleteSession() {
  (await cookies()).delete('session');
}

/** Returns isAuth, userId, role and permissions — no DB query needed */
export async function verifySession() {
  const cookie = (await cookies()).get('session')?.value;
  const session = await decrypt(cookie);

  if (!session?.userId) {
    return { isAuth: false, userId: null, role: 'guest' as string, permissions: [] as string[] };
  }

  return {
    isAuth: true,
    userId: session.userId as string,
    role: (session.role as string) || 'member',
    permissions: (session.permissions as string[]) || [],
  };
}
