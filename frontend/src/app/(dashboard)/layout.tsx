'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { UserRole } from '@/types';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

// LYL-M-FE-026: Lazy load Chatbot — not needed on initial render
const Chatbot = dynamic(() => import('@/components/chat/Chatbot'), { ssr: false });
import ProfileModal from '@/components/dashboard/ProfileModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LOYALLIA_LOGO, LOYALLIA_LOGO_DARK } from '@/lib/loyalliaLogo';
import { PlanProvider } from '@/hooks/usePlan';
import Cookies from 'js-cookie';

import { APP_CONFIG } from '@/lib/constants';
import { stripLocalMinioUrl } from '@/lib/url-utils';
import { NavIcon } from '@/lib/icons';

/** SEC-009: Banner shown when superadmin is impersonating a tenant.
 *  Auto-expires after 1 hour. Backs up admin token in sessionStorage. */

function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(0);

  useEffect(() => {
    const check = () => {
      const adminToken = sessionStorage.getItem('superadmin_token');
      if (!adminToken) { setIsImpersonating(false); return; }

      const startedAt = sessionStorage.getItem('impersonation_started_at');
      if (startedAt) {
        const elapsed = Date.now() - parseInt(startedAt, 10);
        if (elapsed >= APP_CONFIG.MAX_IMPERSONATION_MS) {
          // Auto-expire: restore admin session
          const isProd = process.env.NODE_ENV === 'production';
          Cookies.set('access_token', adminToken, { expires: 1 / 24, secure: isProd, sameSite: 'strict' });
          sessionStorage.removeItem('superadmin_token');
          sessionStorage.removeItem('impersonation_started_at');
          window.location.href = '/superadmin/tenants';
          return;
        }
        setTimeLeftMs(APP_CONFIG.MAX_IMPERSONATION_MS - elapsed);
      }
      setIsImpersonating(true);
    };
    check();
    const interval = setInterval(check, APP_CONFIG.NAV_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!isImpersonating) return null;

  const handleReturn = () => {
    const adminToken = sessionStorage.getItem('superadmin_token');
    if (adminToken) {
      const isProd = process.env.NODE_ENV === 'production';
      Cookies.set('access_token', adminToken, { expires: 1 / 24, secure: isProd, sameSite: 'strict' });
      sessionStorage.removeItem('superadmin_token');
      sessionStorage.removeItem('impersonation_started_at');
      window.location.href = '/superadmin/tenants';
    }
  };

  const mins = Math.floor(timeLeftMs / 60000);
  const secs = Math.floor((timeLeftMs % 60000) / 1000);

  return (
    <div className="bg-purple-600 text-white px-4 py-2.5 flex items-center justify-between text-sm font-medium rounded-xl mb-4 shadow-lg">
      <span className="flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
        Modo impersonación activo
        {timeLeftMs > 0 && (
          <span className="text-purple-200 text-xs ml-1">({mins}:{secs.toString().padStart(2, '0')} restante)</span>
        )}
      </span>
      <button onClick={handleReturn} className="bg-white dark:bg-surface-900 text-purple-700 hover:bg-purple-50 px-3 py-1 rounded-lg text-xs font-bold transition-colors">
        ← Volver al Admin
      </button>
    </div>
  );
}

/** Static className strings for nav links (PERF-004) */
const NAV_LINK_ACTIVE = 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 font-semibold';
const NAV_LINK_INACTIVE = 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 hover:text-surface-900 dark:text-white dark:hover:text-white';

const OWNER_NAV = [
  { href: '/',             label: 'Resumen',       icon: 'home' },
  { href: '/programs',     label: 'Programas',     icon: 'programs' },
  { href: '/customers',    label: 'Clientes',      icon: 'customers' },
  { href: '/analytics',    label: 'Analíticas',    icon: 'analytics' },
  { href: '/automation',   label: 'Automatización',icon: 'automation' },
  { href: '/campaigns',    label: 'Campañas',      icon: 'campaigns' },
  { href: '/locations',    label: 'Sucursales',    icon: 'locations' },
  { href: '/team',         label: 'Equipo',        icon: 'team' },
  { href: '/settings',     label: 'Configuración', icon: 'settings' },
  { href: '/billing',      label: 'Facturación',   icon: 'billing' },
];

const MANAGER_NAV = [
  { href: '/',             label: 'Resumen',       icon: 'home' },
  { href: '/programs',     label: 'Programas',     icon: 'programs' },
  { href: '/customers',    label: 'Clientes',      icon: 'customers' },
  { href: '/analytics',    label: 'Analíticas',    icon: 'analytics' },
  { href: '/locations',    label: 'Sucursales',    icon: 'locations' },
];

const SUPER_ADMIN_NAV = [
  { href: '/superadmin',          label: 'Plataforma',   icon: 'platform' },
  { href: '/superadmin/tenants',  label: 'Negocios',     icon: 'tenants' },
  { href: '/superadmin/metrics',  label: 'Métricas',     icon: 'metrics' },
  { href: '/superadmin/plans',    label: 'Planes',       icon: 'plans' },
  { href: '/superadmin/settings', label: 'Config Global',icon: 'settings' },
];

const ROLE_LABELS_NAV: Record<string, string> = {
  OWNER: 'Propietario', MANAGER: 'Gerente', STAFF: 'Personal', SUPER_ADMIN: 'Super Admin',
};

function getNavForRole(role: string) {
  switch (role) {
    case UserRole.SUPER_ADMIN: return SUPER_ADMIN_NAV;
    case UserRole.OWNER: return OWNER_NAV;
    case UserRole.MANAGER: return MANAGER_NAV;
    default: return [];
  }
}


function NavigationMenu({ nav, pathname }: { nav: Array<{ href: string; label: string; icon: string }>; pathname: string }) {
  return (
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
      {nav.map(({ href, label, icon }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href));
        return (
          <Link key={href} href={href}
            aria-current={active ? 'page' : undefined}
            className={active ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}>
            <NavIcon icon={icon} className="w-[18px] h-[18px] flex-shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function ThemeToggle({ theme, setMode }: { theme: string; setMode: (mode: 'light' | 'dark' | 'system') => void }) {
  return (
    <div className="px-4 py-2 border-t border-surface-100 dark:border-white/[0.06]">
      <div className="flex items-center bg-surface-50 dark:bg-surface-800 rounded-xl p-1 gap-1">
        <button
          onClick={() => setMode('light')}
          aria-pressed={theme === 'light'}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all
            ${theme === 'light' ? 'bg-white dark:bg-surface-700 shadow-sm text-brand-600 dark:text-brand-300' : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'}`}
          id="theme-light-btn"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
          Claro
        </button>
        <button
          onClick={() => setMode('dark')}
          aria-pressed={theme === 'dark'}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all
            ${theme === 'dark' ? 'bg-white dark:bg-surface-700 shadow-sm text-brand-600 dark:text-brand-300' : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'}`}
          id="theme-dark-btn"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
          Oscuro
        </button>
      </div>
    </div>
  );
}

function UserProfile({ user, onProfileClick, onLogout }: {
  user: { full_name?: string; role: string };
  onProfileClick: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="p-4 border-t border-surface-100 dark:border-white/[0.06]">
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onProfileClick(); }}}
        onClick={onProfileClick}
        title="Editar perfil"
      >
        <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900/40 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-brand-600 dark:text-brand-300 font-bold text-sm">{user.full_name?.[0] ?? '?'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{user.full_name}</p>
          <p className="text-xs text-surface-400 truncate">{ROLE_LABELS_NAV[user.role] || user.role}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onLogout(); }} className="btn-ghost p-1.5 rounded-lg" title="Cerrar sesión" id="logout-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function SidebarLogo({ logoSrc, title }: { logoSrc: string; title: string }) {
  return (
    <div className="p-6 border-b border-surface-100 dark:border-white/[0.06]">
      <div className="flex items-center gap-3">
        <img src={logoSrc} alt="Loyallia" className="w-9 h-9 object-contain" />
        <div>
          <p className="font-bold text-surface-900 dark:text-white text-sm">Loyallia</p>
          <p className="text-xs text-surface-400 truncate max-w-[120px]">{title}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, refreshUser } = useAuth();
  const { theme, setMode } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [showProfile, setShowProfile] = useState(false);
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  /* Fetch tenant logo for sidebar branding */
  useEffect(() => {
    if (!user || user.role === UserRole.SUPER_ADMIN) return;
    fetch('/api/v1/tenants/me/')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.logo_url) {
          let url = data.logo_url;
          url = stripLocalMinioUrl(url);
          setTenantLogo(url);
        }
      })
      .catch(() => {});
  }, [user]);

  // RBAC redirects — consolidated into single useEffect (BUG-001/002 fix)
  const OWNER_ONLY_ROUTES = ['/campaigns', '/billing', '/settings', '/automation'];
  const isRestrictedRoute = user && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN
    && OWNER_ONLY_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));

  useEffect(() => {
    if (loading || !user) return;

    // STAFF → scanner only
    if (user.role === UserRole.STAFF && !pathname.startsWith('/scanner')) {
      router.replace('/scanner/scan');
      return;
    }
    // SUPER_ADMIN → superadmin only
    if (user.role === UserRole.SUPER_ADMIN && !pathname.startsWith('/superadmin')) {
      router.replace('/superadmin');
      return;
    }
    // Non-superadmin → block superadmin routes
    if (user.role !== UserRole.SUPER_ADMIN && pathname.startsWith('/superadmin')) {
      router.replace('/');
      return;
    }
    // RBAC: block non-owner routes
    if (isRestrictedRoute) {
      router.replace('/');
    }
  }, [loading, user, pathname, isRestrictedRoute, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="spinner w-10 h-10" />
      </div>
    );
  }

  if (!user) return null;

  // STAFF: render nothing while redirect happens
  if (user.role === UserRole.STAFF) return null;

  // Block rendering for wrong role paths (redirect is in-flight)
  if (user.role === UserRole.SUPER_ADMIN && !pathname.startsWith('/superadmin')) return null;
  if (user.role !== UserRole.SUPER_ADMIN && pathname.startsWith('/superadmin')) return null;
  if (isRestrictedRoute) return null;

  const handleLogout = async () => {
    await logout();
    toast.success('Sesión cerrada');
  };

  const nav = getNavForRole(user.role);
  const sidebarTitle = user.role === UserRole.SUPER_ADMIN ? 'Plataforma SaaS' : user.tenant_name;
  const logoSrc = theme === 'dark' ? LOYALLIA_LOGO_DARK : LOYALLIA_LOGO;

  return (
    <div className="min-h-screen flex bg-surface-50 dark:bg-surface-950">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-white/[0.06] flex flex-col fixed h-full z-30">
        <SidebarLogo logoSrc={tenantLogo || logoSrc} title={sidebarTitle} />
        <NavigationMenu nav={nav} pathname={pathname} />
        <ThemeToggle theme={theme} setMode={setMode} />
        <UserProfile user={user} onProfileClick={() => setShowProfile(true)} onLogout={handleLogout} />
        {/* Branding */}
        <div className="px-4 pb-3 pt-1">
          <p className="text-[10px] text-surface-300 dark:text-surface-500 text-center tracking-wide leading-relaxed">
            <span className="font-semibold text-surface-400 dark:text-surface-400">Loyallia</span> · Intelligent Rewards
            {process.env.NEXT_PUBLIC_PARTNER_URL && (
              <><br /><a href={process.env.NEXT_PUBLIC_PARTNER_URL} target="_blank" rel="noopener noreferrer" className="text-[9px] opacity-60 hover:opacity-100 transition-opacity">powered by Yachaq.ai</a></>
            )}
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-8 min-h-screen animate-fade-in relative">
        <PlanProvider>
          <ImpersonationBanner />
          <ErrorBoundary>{children}</ErrorBoundary>
          <Chatbot />
        </PlanProvider>
      </main>

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onProfileUpdated={() => {
            setShowProfile(false);
            refreshUser();
          }}
        />
      )}
    </div>
  );
}
