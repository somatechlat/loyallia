import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('access_token')?.value;
    const { pathname } = request.nextUrl;

    const publicRoutes = ['/', '/about', '/pricing', '/contact', '/privacy', '/terms', '/portal'];
    const protectedRoutes = [
        '/dashboard', '/billing', '/campaigns', '/programs',
        '/customers', '/locations', '/users', '/automation',
        '/analytics', '/notifications', '/wallet', '/settings',
        '/team', '/scanner', '/superadmin', '/onboarding',
    ];
    const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

    const isPublic = publicRoutes.some(r => pathname === r || pathname.startsWith(r + '/'));
    if (isPublic) return NextResponse.next();

    const isProtected = protectedRoutes.some(r => pathname.startsWith(r));
    const isAuthRoute = authRoutes.some(r => pathname.startsWith(r));

    if (isProtected && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isAuthRoute && token) {
        // Logged-in users shouldn't see auth pages. Redirect to home; the
        // role-based rules below bounce SUPER_ADMIN/STAFF to their landing.
        return NextResponse.redirect(new URL('/', request.url));
    }

    if (token && isProtected) {
        try {
            const parts = token.split('.');
            if (parts.length === 3 && parts[1]) {
                const payload = JSON.parse(atob(parts[1]));
                const role = (payload.role || '') as string;

                if (role === 'STAFF' && !pathname.startsWith('/scanner')) {
                    return NextResponse.redirect(new URL('/scanner/scan', request.url));
                }
                if (role === 'SUPER_ADMIN' && !pathname.startsWith('/superadmin')) {
                    return NextResponse.redirect(new URL('/superadmin', request.url));
                }
                if (role !== 'SUPER_ADMIN' && pathname.startsWith('/superadmin')) {
                    return NextResponse.redirect(new URL('/', request.url));
                }
                const OWNER_ONLY_ROUTES = ['/campaigns', '/billing', '/settings', '/automation'];
                const isOwnerOnly = OWNER_ONLY_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
                if (isOwnerOnly && role !== 'OWNER' && role !== 'SUPER_ADMIN') {
                    return NextResponse.redirect(new URL('/', request.url));
                }
            }
        } catch {
            // Invalid token — let layout handle it
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
