import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security middleware for route protection.
 * Redirects unauthenticated users to /login and authenticated users away from auth pages.
 */
export function middleware(request: NextRequest) {
    const token = request.cookies.get('access_token')?.value;
    const { pathname } = request.nextUrl;

    // Public routes (bypass auth check)
    const publicRoutes = ['/', '/about', '/pricing', '/contact', '/privacy', '/terms'];

    // Protected routes — require authentication
    const protectedRoutes = [
        '/dashboard', '/billing', '/campaigns', '/programs',
        '/customers', '/locations', '/users', '/automation',
        '/analytics', '/notifications', '/wallet', '/settings',
        '/team', '/scanner', '/superadmin', '/onboarding',
    ];

    // Auth-only routes — redirect authenticated users away
    const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

    const isPublic = publicRoutes.some(r => pathname === r);
    if (isPublic) return NextResponse.next();

    const isProtected = protectedRoutes.some(r => pathname.startsWith(r));
    const isAuthRoute = authRoutes.some(r => pathname.startsWith(r));

    // Unauthenticated users trying to access protected routes → redirect to login
    if (isProtected && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Authenticated users trying to access auth routes → redirect to dashboard
    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
