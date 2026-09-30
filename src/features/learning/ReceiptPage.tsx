import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Logo } from '@/brand/Logo';
import { BRAND } from '@/brand/logoGeometry';
import { env } from '@/config/env';
import { backend } from '@/data';
import { RequireAuth } from '@/features/auth/SignIn';
import { formatDateTime } from '@/lib/format';
import { formatInr } from '@/lib/pricing';
import { PageMeta } from '@/shared/components/PageMeta';
import { EmptyState, PageLoader } from '@/shared/components/States';
import { Button } from '@/shared/ui/button';

function Receipt() {
  const { id = '' } = useParams();
  const { data: reg, isLoading } = useQuery({ queryKey: ['registration', id], queryFn: async () => (await backend()).getRegistration(id) });
  if (isLoading) return <PageLoader />;
  if (!reg || reg.status !== 'APPROVED')
    return (
      <div className="container py-16">
        <EmptyState title="Receipt not available" description="Receipts are issued once a payment is verified." />
      </div>
    );
  return (
    <div className="container max-w-2xl py-12">
      <PageMeta title={`Receipt ${reg.reference}`} noindex />
      <div className="no-print mb-6 flex justify-end">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer /> Print / Save as PDF
        </Button>
      </div>
      <article className="rounded-3xl border bg-white p-8 text-midnight shadow-lift print:border-0 print:shadow-none sm:p-12">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b pb-6">
          <Logo lockup="horizontal" size={48} variant="full" />
          <div className="text-right text-sm">
            <p className="font-display text-2xl font-semibold">Receipt</p>
            <p>No. {reg.reference}</p>
            <p>{formatDateTime(reg.decidedAt ?? reg.updatedAt)}</p>
          </div>
        </header>
        <section className="grid gap-6 py-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Billed to</p>
            <p className="mt-1 font-semibold">{reg.participant.name}</p>
            <p>{reg.participant.email}</p>
            <p>{reg.participant.phone}</p>
            {reg.participant.city && <p>{reg.participant.city}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-xs uppercase tracking-wider text-slate-500">Paid to</p>
            <p className="mt-1 font-semibold">{env.upi.payeeName}</p>
            <p>UPI: {env.upi.vpa}</p>
            <p>{env.contact.email}</p>
          </div>
        </section>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-3">{reg.courseTitle}</td>
              <td className="py-3 text-right">{formatInr(reg.basePriceInr)}</td>
            </tr>
            {reg.discountInr > 0 && (
              <tr className="border-b">
                <td className="py-3">Discount {reg.couponCode ? `(${reg.couponCode})` : ''}</td>
                <td className="py-3 text-right">−{formatInr(reg.discountInr)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-4 font-display text-lg font-semibold">Total paid</td>
              <td className="py-4 text-right font-display text-lg font-semibold">{formatInr(reg.amountInr)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-4 text-sm">Payment method: UPI · UTR {reg.utr ?? '—'}</p>
        <footer className="mt-10 border-t pt-6 text-xs text-slate-500">
          {BRAND.name} · {BRAND.tagline}. This is a computer-generated receipt and does not require a signature.
        </footer>
      </article>
    </div>
  );
}

export default function ReceiptPage() {
  return (
    <RequireAuth>
      <Receipt />
    </RequireAuth>
  );
}
