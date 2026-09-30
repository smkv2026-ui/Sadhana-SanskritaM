import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useMemo } from 'react';
import { backend } from '@/data';
import { toCsv } from '@/lib/csv';
import { downloadText } from '@/lib/ics';
import { formatDateTime } from '@/lib/format';
import { EmptyState } from '@/shared/components/States';
import { Button } from '@/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/overlays';
import { Badge } from '@/shared/ui/primitives';
import { AdminHeader } from './AdminApp';

export default function SubscribersAdmin() {
  const q = useInfiniteQuery({
    queryKey: ['admin', 'subscribers'],
    queryFn: async ({ pageParam }) => (await backend()).listSubscribers({ pageSize: 50, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (l) => l.next,
  });
  const log = useQuery({ queryKey: ['admin', 'log'], queryFn: async () => (await backend()).listNotificationLog(200) });
  const rows = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);

  return (
    <div>
      <AdminHeader
        title="Subscribers"
        description="Never publicly readable — only admins can list them."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={!rows.length}
            onClick={() =>
              downloadText(
                'subscribers.csv',
                toCsv(
                  rows.map((s) => ({
                    name: s.name,
                    email: s.email,
                    whatsapp: s.whatsapp ?? '',
                    status: s.status,
                    interests: s.interests.join('|'),
                    email_consent_at: s.consent.email?.at ?? '',
                    whatsapp_consent_at: s.consent.whatsapp?.at ?? '',
                    source: s.source,
                    created_at: s.createdAt,
                  })),
                ),
                'text/csv',
              )
            }
          >
            <Download /> Export CSV
          </Button>
        }
      />
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Subscribers ({rows.length}{q.hasNextPage ? '+' : ''})</TabsTrigger>
          <TabsTrigger value="log">Send log</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          {!rows.length && !q.isLoading ? (
            <EmptyState title="No subscribers yet" />
          ) : (
            <div className="overflow-x-auto rounded-3xl border bg-card">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Channels</th>
                    <th className="px-4 py-3">Interests</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Consent</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {s.channels.email && <Badge variant="outline">Email</Badge>} {s.channels.whatsapp && <Badge variant="success">WhatsApp</Badge>}
                      </td>
                      <td className="px-4 py-3 text-xs">{s.interests.join(', ')}</td>
                      <td className="px-4 py-3">
                        <Badge variant={s.status === 'CONFIRMED' ? 'success' : s.status === 'PENDING' ? 'warning' : 'muted'}>{s.status.toLowerCase()}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {s.consent.email && <p>Email · {formatDateTime(s.consent.email.at)}</p>}
                        {s.consent.whatsapp && <p>WA · {formatDateTime(s.consent.whatsapp.at)}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {q.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => void q.fetchNextPage()} loading={q.isFetchingNextPage}>
                Load more
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="log">
          {!log.data?.length ? (
            <EmptyState title="Nothing sent yet" />
          ) : (
            <ul className="divide-y rounded-3xl border bg-card text-sm">
              {log.data.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Badge variant={l.status === 'failed' ? 'destructive' : l.channel === 'whatsapp' ? 'success' : 'outline'}>
                    {l.channel} · {l.status}
                  </Badge>
                  <span className="font-medium">{l.kind}</span>
                  <span className="text-muted-foreground">{l.recipient}</span>
                  <span className="flex-1 truncate text-muted-foreground">{l.subject}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(l.at)}</span>
                  {l.error && <span className="w-full text-xs text-destructive">{l.error}</span>}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
