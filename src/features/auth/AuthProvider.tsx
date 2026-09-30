import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { backend } from '@/data';
import type { AuthUser } from '@/data/types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  sendEmailLink: (email: string, continuePath: string) => Promise<void>;
  signOut: () => Promise<void>;
  demoSignIn?: (persona: 'learner' | 'admin') => Promise<void>;
  /** Opens the global sign-in dialog. */
  requestSignIn: (reason?: string) => void;
  signInRequest: { open: boolean; reason?: string };
  closeSignIn: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [demo, setDemo] = useState<AuthState['demoSignIn']>();
  const [signInRequest, setSignInRequest] = useState<{ open: boolean; reason?: string }>({ open: false });

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let alive = true;
    void backend().then((b) => {
      if (!alive) return;
      if (b.auth.demoSignIn) setDemo(() => b.auth.demoSignIn);
      unsub = b.auth.onChange(async (u) => {
        setUser(u);
        setIsAdmin(u ? await b.isAdmin(u.uid) : false);
        setLoading(false);
        if (u) setSignInRequest({ open: false });
      });
    });
    return () => {
      alive = false;
      unsub?.();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => (await backend()).auth.signInWithGoogle(), []);
  const sendEmailLink = useCallback(async (email: string, path: string) => (await backend()).auth.sendEmailLink(email, path), []);
  const signOut = useCallback(async () => (await backend()).auth.signOut(), []);
  const requestSignIn = useCallback((reason?: string) => setSignInRequest({ open: true, reason }), []);
  const closeSignIn = useCallback(() => setSignInRequest({ open: false }), []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      isAdmin,
      signInWithGoogle,
      sendEmailLink,
      signOut,
      demoSignIn: demo,
      requestSignIn,
      signInRequest,
      closeSignIn,
    }),
    [user, loading, isAdmin, signInWithGoogle, sendEmailLink, signOut, demo, requestSignIn, signInRequest, closeSignIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
