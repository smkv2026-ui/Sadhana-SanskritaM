import { BookOpen, ClipboardCheck, FileClock, LayoutDashboard, Megaphone, Palette, Table2, Users, Workflow } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { env } from '@/config/env';
import { useAuth } from '@/features/auth/AuthProvider';
import { RequireAuth } from '@/features/auth/SignIn';
import { cn } from '@/lib/utils';
import { PageMeta } from '@/shared/components/PageMeta';
import { PageLoader } from '@/shared/components/States';
import { CopyButton } from '@/shared/components/Bits';

const Overview = lazy(() => import('./Overview'));
const VerificationQueue = lazy(() => import('./VerificationQueue'));
const RegistrationsAdmin = lazy(() => import('./RegistrationsAdmin'));
const CoursesAdmin = lazy(() => import('./CoursesAdmin'));
const ContentAdmin = lazy(() => import('./ContentAdmin'));
const SubscribersAdmin = lazy(() => import('./SubscribersAdmin'));
const NotifyComposer = lazy(() => import('./NotifyComposer'));
const RequestsKanban = lazy(() => import('./RequestsKanban'));
const AuditAdmin = lazy(() => import('./AuditAdmin'));

export const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/verify', label: 'Verify payments', icon: ClipboardCheck },
  { to: '/admin/registrations', label: 'Registrations', icon: Table2 },
  { to: '/admin/courses', label: 'Courses & events', icon: BookOpen },
  { to: '/admin/notify', label: 'Notify', icon: Megaphone },
  { to: '/admin/subscribers', label: 'Subscribers', icon: Users },
  { to: '/admin/requests', label: 'Custom requests', icon: Workflow },
  { to: '/admin/content', label: 'Categories & content', icon: Palette },
  { to: '/admin/audit', label: 'Audit & inbox', icon: FileClock },
];

function NotAdmin() {
  const { user } = useAuth();
  return (
    <div className="container max-w-xl py-16">
      <div className="rounded-3xl border bg-card p-8">
        <h1 className="text-2xl font-semibold">Admins only</h1>
        <p className="mt-3 text-muted-foreground">
          Your account isn’t an administrator. To make it one, open the Firebase console → Firestore → create collection <code>admins</code> → document ID =
          your UID (below) → add any field (e.g. <code>role: "owner"</code>).
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted p-3 font-mono text-sm">
          <span className="flex-1 truncate">{user?.uid}</span>
          {user && <CopyButton value={user.uid} label="UID" />}
        </div>
        {env.backend === 'demo' && <p className="mt-4 text-sm">Demo mode: sign out and choose “Admin” in the sign-in dialog.</p>}
      </div>
    </div>
  );
}

function Shell() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAdmin) return <NotAdmin />;
  return (
    <div className="container py-8">
      <PageMeta title="Admin" noindex />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr] lg:gap-8">
        <nav aria-label="Admin" className="-mx-4 min-w-0 px-4 lg:sticky lg:top-24 lg:mx-0 lg:self-start lg:px-0">
          <ul className="flex gap-1 overflow-x-auto pb-2 [scrollbar-width:none] lg:flex-col lg:overflow-visible">
            {ADMIN_NAV.map((n) => (
              <li key={n.to} className="shrink-0">
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    cn('flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-accent/10', isActive && 'bg-accent/15 text-foreground')
                  }
                >
                  <n.icon className="h-4 w-4" /> {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route index element={<Overview />} />
              <Route path="verify" element={<VerificationQueue />} />
              <Route path="registrations" element={<RegistrationsAdmin />} />
              <Route path="courses" element={<CoursesAdmin />} />
              <Route path="notify" element={<NotifyComposer />} />
              <Route path="subscribers" element={<SubscribersAdmin />} />
              <Route path="requests" element={<RequestsKanban />} />
              <Route path="content" element={<ContentAdmin />} />
              <Route path="audit" element={<AuditAdmin />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default function AdminApp() {
  return (
    <RequireAuth reason="Admin dashboard — sign in with an administrator account.">
      <Shell />
    </RequireAuth>
  );
}

export function AdminHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
