import { useQuery } from '@tanstack/react-query';
import { backend } from '@/data';
import { formatDateTime } from '@/lib/format';
import { EmptyState } from '@/shared/components/States';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/overlays';
import { Badge } from '@/shared/ui/primitives';
import { AdminHeader } from './AdminApp';

export default function AuditAdmin() {
  const audit = useQuery({ queryKey: ['admin', 'audit'], queryFn: async () => (await backend()).listAudit(200) });
  const inbox = useQuery({ queryKey: ['admin', 'inbox'], queryFn: async () => (await backend()).listContactMessages() });
  return (
    <div>
      <AdminHeader title="Audit log & inbox" description="Every admin action is recorded (append-only). Contact messages and data-deletion requests arrive in the inbox." />
      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Inbox ({inbox.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox">
          {!inbox.data?.length ? (
            <EmptyState title="Inbox zero" />
          ) : (
            <ul className="space-y-3">
              {inbox.data.map((m) => (
                <li key={m.id} className="rounded-2xl border bg-card p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={m.kind === 'delete-my-data' ? 'destructive' : 'outline'}>{m.kind === 'delete-my-data' ? 'Delete my data' : m.subject}</Badge>
                    <span className="font-semibold">{m.name}</span>
                    <a href={`mailto:${m.email}`} className="text-accent underline">
                      {m.email}
                    </a>
                    <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-line">{m.message}</p>
                  {m.uid && <p className="mt-2 font-mono text-xs text-muted-foreground">uid: {m.uid}</p>}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="audit">
          {!audit.data?.length ? (
            <EmptyState title="No admin actions yet" />
          ) : (
            <ul className="divide-y rounded-3xl border bg-card text-sm">
              {audit.data.map((a) => (
                <li key={a.id} className="flex flex-wrap gap-3 px-4 py-3">
                  <span className="w-44 shrink-0 text-muted-foreground">{formatDateTime(a.at)}</span>
                  <span className="font-mono font-semibold">{a.action}</span>
                  <span className="truncate">{a.target}</span>
                  <span className="text-muted-foreground">{a.details}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">{a.by.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
