'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/products', label: 'Products' },
  { href: '/dashboard/movements', label: 'Movements' },
  { href: '/dashboard/expiry', label: 'Expiry' },
  { href: '/dashboard/brands', label: 'Brands' },
];

export default function DashboardSidebar({
  username,
  open,
  onNavigate,
}: {
  username: string;
  open: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    try {
      await clientApi.logout();
      router.replace('/login');
      router.refresh();
    } catch {
      router.replace('/login');
    }
  }

  return (
    <aside className={`dash-sidebar clip-card ${open ? 'is-open' : ''}`}>
      <Link href="/" className="dash-sidebar-logo" onClick={onNavigate}>
        <img src="/assets/images/vitapharm.png" alt="Vitapharm" />
      </Link>

      <nav className="dash-nav">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`dash-nav-link ${active ? 'is-active' : ''}`}
              onClick={onNavigate}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="dash-sidebar-footer">
        <div className="dash-sidebar-user">Signed in as {username}</div>
        <button className="btn btn-outline" type="button" onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );
}
