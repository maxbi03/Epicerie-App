import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const AUTH_COOKIE = 'auth_token';

// Routes /api/* accessibles sans JWT (le contrôle fin reste dans la route).
// Tout le reste sous /api/* exige un JWT valide.
const PUBLIC_API = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/me',                 // renvoie lui-même 401 proprement
  '/api/auth/verify-phone/send',
  '/api/auth/verify-phone/confirm',
  '/api/checkout/webhook',        // appelé par Mollie/Payrexx, pas par un user
  '/api/products',                // catalogue public
  '/api/news',                    // actualités publiques
  '/api/address-search',          // utilisé pendant l'inscription (avant login)
  '/api/reports',                 // signalement autorisé aux visiteurs
  '/api/uploads',                 // fichiers publics (avatars, images produits)
];

function isPublicApi(pathname) {
  return PUBLIC_API.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

async function hasValidToken(request) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Pages /admin* : exiger un JWT valide, sinon rediriger vers /home.
  // Le contrôle du rôle admin reste fait dans le layout et les routes API.
  if (pathname.startsWith('/admin')) {
    if (await hasValidToken(request)) return NextResponse.next();
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // Routes /api/* hors liste blanche : exiger un JWT valide.
  if (pathname.startsWith('/api/')) {
    if (isPublicApi(pathname)) return NextResponse.next();
    if (await hasValidToken(request)) return NextResponse.next();
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
