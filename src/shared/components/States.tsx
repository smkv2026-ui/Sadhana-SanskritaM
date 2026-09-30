import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { LogoMark } from '@/brand/Logo';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/primitives';

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col items-center rounded-3xl border border-dashed px-6 py-14 text-center', className)}
    >
      <LogoMark size={64} compact decorative className="animate-float-slow opacity-80" />
      <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

export function ErrorState({ error, onRetry, className }: { error?: unknown; onRetry?: () => void; className?: string }) {
  const message = error instanceof Error ? error.message : 'Something went wrong while loading.';
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('flex flex-col items-center rounded-3xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center', className)}
    >
      <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
      <p className="mt-3 font-medium">{message}</p>
      <p className="mt-1 text-sm text-muted-foreground">Check your connection — cached content still works offline.</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCw /> Try again
        </Button>
      )}
    </motion.div>
  );
}

export function CardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-3xl border p-6">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="mt-5 h-5 w-3/4" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-6 h-10 w-32 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50svh] items-center justify-center" aria-busy="true" aria-label="Loading page">
      <LogoMark size={72} compact decorative className="animate-pulse" />
    </div>
  );
}
