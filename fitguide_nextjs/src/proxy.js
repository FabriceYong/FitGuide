import { NextResponse } from 'next/server';

// Set by the API next to the httpOnly session cookies. It only says that a
// session exists; it grants nothing, and every API call is still checked.
const SESSION_HINT_COOKIE = 'fitguide_session';

/**
 * Pages that only make sense with an account (listed in `config.matcher`).
 * Signed-out visitors are sent to the sign-in screen and brought back after.
 */
export function proxy(request) {
  if (request.cookies.get(SESSION_HINT_COOKIE)?.value === '1') return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const signIn = new URL('/', request.url);
  signIn.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(signIn);
}

// Must be static literals (Next.js reads them at build time).
export const config = {
  matcher: [
    '/progress/:path*',
    '/plan/:path*',
    '/nutrition/:path*',
    '/community/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/studio/:path*',
  ],
};
