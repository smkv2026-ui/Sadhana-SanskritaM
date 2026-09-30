import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthProvider';
import { PreferencesProvider } from './features/experience/preferences';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (count, err) => count < 2 && !(err instanceof Error && /permission|not allowed/i.test(err.message)),
      networkMode: 'offlineFirst',
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}
