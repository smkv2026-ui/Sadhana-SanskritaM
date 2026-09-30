import { Link } from 'react-router-dom';
import { LogoMark } from '@/brand/Logo';
import { openCommandPalette } from '@/features/experience/commandBus';
import { PageMeta } from '@/shared/components/PageMeta';
import { Button } from '@/shared/ui/button';

export default function NotFoundPage() {
  return (
    <div className="container flex flex-col items-center py-24 text-center">
      <PageMeta title="Page not found" noindex />
      <LogoMark size={120} compact decorative className="animate-float-slow" />
      <p lang="sa" className="deva mt-6 text-xl text-accent">
        मार्गः न लब्धः
      </p>
      <h1 className="mt-2 text-4xl font-semibold">This path hasn’t bloomed yet</h1>
      <p className="mt-3 text-muted-foreground">The page you’re looking for doesn’t exist or has moved.</p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
        <Button variant="outline" onClick={openCommandPalette}>
          Search the site
        </Button>
      </div>
    </div>
  );
}
