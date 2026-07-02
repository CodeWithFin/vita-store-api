import { redirect } from 'next/navigation';
import DashboardShell from '@/components/DashboardShell';
import { serverFetch } from '@/lib/api-server';
import './dashboard.css';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let username = 'Admin';

  try {
    const me = await serverFetch<{ data: { user: { username: string } } }>('/api/auth/me');
    username = me.data.user.username;
  } catch {
    redirect('/login?next=/dashboard');
  }

  return <DashboardShell username={username}>{children}</DashboardShell>;
}
