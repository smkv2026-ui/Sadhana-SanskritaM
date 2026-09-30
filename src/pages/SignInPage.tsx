import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { RequireAuth } from '@/features/auth/SignIn';
import { routes } from '@/lib/links';
import { PageMeta } from '@/shared/components/PageMeta';

export default function SignInPage() {
  const { user } = useAuth();
  return (
    <>
      <PageMeta title="Sign in" noindex />
      {user ? <Navigate to={routes.myLearning} replace /> : <RequireAuth reason="Sign in to register for courses and track your learning.">{null}</RequireAuth>}
    </>
  );
}
