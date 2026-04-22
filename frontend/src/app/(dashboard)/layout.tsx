'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import toast from 'react-hot-toast';
import Chatbot from '@/components/chat/Chatbot';
import ProfileModal from '@/components/dashboard/ProfileModal';
import { LOYALLIA_LOGO, LOYALLIA_LOGO_DARK } from '@/lib/loyalliaLogo';

/* ───────── SVG Icon Paths ───────── */
const NAV_ICONS: Record<string, string> = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
  programs: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  customers: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  analytics: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  automation: 'M13 10V3L4 14h7v7l9-11h-7z',
  campaigns: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  locations: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  team: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  billing: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  platform: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
  tenants: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  metrics: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  plans: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
};

function NavIcon({ icon, className = 'w-5 h-5' }: { icon: string; className?: string }) {
  const d = NAV_ICONS[icon] || NAV_ICONS['home'];
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/* ───────── Navigation Per Role ───────── */

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
    case 'SUPER_ADMIN': return SUPER_ADMIN_NAV;
    case 'OWNER': return OWNER_NAV;
    case 'MANAGER': return MANAGER_NAV;
    default: return [];
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, refreshUser } = useAuth();
  const { theme, mode, setMode } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [showProfile, setShowProfile] = useState(false);
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  /* Fetch tenant logo for sidebar branding */
  useEffect(() => {
    if (!user || user.role === 'SUPER_ADMIN') return;
    fetch('/api/v1/tenants/me/')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.logo_url) setTenantLogo(data.logo_url); })
      .catch(() => {});
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="spinner w-10 h-10" />
      </div>
    );
  }

  if (!user) return null;

  // STAFF is kicked completely to PWA
  if (user.role === 'STAFF') {
    if (typeof window !== 'undefined' && !pathname.startsWith('/scanner')) {
      window.location.replace('/scanner/scan');
    }
    return null;
  }

  // SUPER_ADMIN Isolation: Should only be in /superadmin
  if (user.role === 'SUPER_ADMIN') {
    if (typeof window !== 'undefined' && !pathname.startsWith('/superadmin')) {
      window.location.replace('/superadmin');
      return null;
    }
  } else {
    // Normal users shouldn't access superadmin
    if (typeof window !== 'undefined' && pathname.startsWith('/superadmin')) {
      window.location.replace('/');
      return null;
    }
  }

  // RBAC: Restrict OWNER-only routes from MANAGER/other roles (SYS-003)
  const OWNER_ONLY_ROUTES = ['/campaigns', '/billing', '/settings', '/automation'];
  if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') {
    const isRestricted = OWNER_ONLY_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
    if (isRestricted && typeof window !== 'undefined') {
      window.location.replace('/');
      return null;
    }
  }

  const handleLogout = async () => {
    await logout();
    toast.success('Sesión cerrada');
  };

  const nav = getNavForRole(user.role);
  const sidebarTitle = user.role === 'SUPER_ADMIN' ? 'Plataforma SaaS' : user.tenant_name;
  const logoSrc = theme === 'dark' ? LOYALLIA_LOGO_DARK : LOYALLIA_LOGO;

  return (
    <div className="min-h-screen flex bg-surface-50 dark:bg-surface-950">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-white/[0.06] flex flex-col fixed h-full z-30">
        {/* Logo */}
        <div className="p-6 border-b border-surface-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="Loyallia" className="w-9 h-9 object-contain" />
            <div>
              <p className="font-bold text-surface-900 dark:text-white text-sm">Loyallia</p>
              <p className="text-xs text-surface-400 truncate max-w-[120px]">{sidebarTitle}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
          {nav.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  ${active
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 font-semibold'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white'
                  }`}>
                <NavIcon icon={icon} className="w-[18px] h-[18px] flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Theme toggle */}
        <div className="px-4 py-2 border-t border-surface-100 dark:border-white/[0.06]">
          <div className="flex items-center bg-surface-50 dark:bg-surface-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setMode('light')}
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

        {/* User footer — clickable for profile */}
        <div className="p-4 border-t border-surface-100 dark:border-white/[0.06]">
          <div
            className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            onClick={() => setShowProfile(true)}
            title="Editar perfil"
          >
            <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900/40 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-brand-600 dark:text-brand-300 font-bold text-sm">{user.full_name?.[0] ?? '?'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{user.full_name}</p>
              <p className="text-xs text-surface-400 truncate">{ROLE_LABELS_NAV[user.role] || user.role}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="btn-ghost p-1.5 rounded-lg" title="Cerrar sesión" id="logout-btn">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Branding */}
        <div className="px-4 pb-3 pt-1">
          <p className="text-[10px] text-surface-300 dark:text-surface-500 text-center tracking-wide leading-relaxed">
            <span className="font-semibold text-surface-400 dark:text-surface-400">Loyallia</span> · Intelligent Rewards
            <br /><span className="text-[9px] opacity-60">powered by Yachaq.ai</span>
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-8 min-h-screen animate-fade-in relative">
        {children}
        <Chatbot />
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
