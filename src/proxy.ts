import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_for_dev_only';
const encodedKey = new TextEncoder().encode(secretKey);

export async function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && secretKey === 'fallback_secret_key_for_dev_only') {
    throw new Error('FATAL: JWT_SECRET is not set in production environment');
  }

  const session = request.cookies.get('session')?.value;

  // Protect /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const { payload } = await jwtVerify(session, encodedKey, {
        algorithms: ['HS256'],
      });
      
      if (!payload.userId) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Enforce role-based access for /admin routes
      const allowedRoles = ['group_leader', 'campus_leader', 'admin', 'super_admin'];
      if (!payload.role || !allowedRoles.includes(payload.role as string)) {
        return NextResponse.redirect(new URL('/', request.url)); // Redirect unauthorized to home
      }
    } catch (error) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
