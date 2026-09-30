import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Mail, MessageCircle, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { env } from '@/config/env';
import { backend, BackendError } from '@/data';
import { useAuth } from '@/features/auth/AuthProvider';
import { routes } from '@/lib/links';
import { waMeLink } from '@/providers/whatsapp';
import { PageMeta } from '@/shared/components/PageMeta';
import { Button } from '@/shared/ui/button';
import { Field, Input, NativeSelect, Textarea } from '@/shared/ui/primitives';

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  email: z.string().trim().email('Enter a valid email').max(254),
  topic: z.enum(['general', 'payment', 'access', 'custom-app', 'delete-my-data']),
  message: z.string().trim().min(10, 'Please write a little more').max(3000),
  website: z.string().max(0).optional(),
});
type Values = z.infer<typeof schema>;

export default function ContactPage() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const initialTopic = (params.get('topic') as Values['topic']) ?? 'general';
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.displayName ?? '',
      email: user?.email ?? '',
      topic: schema.shape.topic.options.includes(initialTopic) ? initialTopic : 'general',
      message: initialTopic === 'delete-my-data' ? 'Please delete all personal data you hold about me (DPDP Act, 2023).' : '',
      website: '',
    },
  });
  const e = form.formState.errors;

  const onSubmit = form.handleSubmit(async (v) => {
    if (v.website) return;
    try {
      await (await backend()).createContactMessage({
        name: v.name,
        email: v.email.toLowerCase(),
        subject: v.topic,
        message: v.message,
        kind: v.topic === 'delete-my-data' ? 'delete-my-data' : 'contact',
        uid: user?.uid ?? null,
      });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof BackendError ? err.message : 'Could not send. Please email us instead.');
    }
  });

  return (
    <div className="container py-12 sm:py-16">
      <PageMeta title="Contact" description="Questions about courses, payments or custom apps? We’d love to hear from you." path={routes.contact} />
      <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="eyebrow">Contact</p>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">We’re listening</h1>
          <p className="mt-4 text-lg text-muted-foreground">Questions about a course, a payment, access or a custom app — write to us and a real person will reply within 2 working days.</p>
          <div className="mt-8 space-y-3">
            <a href={`mailto:${env.contact.email}`} className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition hover:border-accent">
              <Mail className="h-5 w-5 text-accent" /> {env.contact.email}
            </a>
            {env.contact.whatsapp && (
              <a href={waMeLink({ to: env.contact.whatsapp, text: 'Namaste! I have a question about Sadhana Sanskritam.' })} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition hover:border-accent">
                <MessageCircle className="h-5 w-5 text-accent" /> WhatsApp us
              </a>
            )}
          </div>
          <div className="mt-8 rounded-2xl bg-muted/50 p-5 text-sm">
            <p className="font-semibold">Your data rights</p>
            <p className="mt-1 text-muted-foreground">
              Under India’s DPDP Act you can ask us to access, correct or delete your personal data. Choose “Delete my data” as the topic and we will
              confirm within 30 days.
            </p>
          </div>
        </div>
        {sent ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center rounded-3xl border bg-card p-10 text-center">
            <Send className="h-10 w-10 text-success" />
            <h2 className="mt-4 text-2xl font-semibold">Message sent</h2>
            <p className="mt-2 text-muted-foreground">Dhanyavādaḥ! We’ll reply to your email soon.</p>
          </motion.div>
        ) : (
          <form noValidate onSubmit={onSubmit} className="space-y-5 rounded-3xl border bg-card p-6 sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="ct-name" label="Name" required error={e.name?.message}>
                <Input id="ct-name" autoComplete="name" aria-invalid={Boolean(e.name)} {...form.register('name')} />
              </Field>
              <Field id="ct-email" label="Email" required error={e.email?.message}>
                <Input id="ct-email" type="email" autoComplete="email" aria-invalid={Boolean(e.email)} {...form.register('email')} />
              </Field>
            </div>
            <Field id="ct-topic" label="Topic">
              <NativeSelect id="ct-topic" {...form.register('topic')}>
                <option value="general">General question</option>
                <option value="payment">Payment</option>
                <option value="access">Access to a course</option>
                <option value="custom-app">Custom app</option>
                <option value="delete-my-data">Delete my data</option>
              </NativeSelect>
            </Field>
            <Field id="ct-msg" label="Message" required error={e.message?.message}>
              <Textarea id="ct-msg" rows={6} aria-invalid={Boolean(e.message)} {...form.register('message')} />
            </Field>
            <div aria-hidden className="absolute left-[-9999px]">
              <input tabIndex={-1} autoComplete="off" {...form.register('website')} />
            </div>
            <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
              <Send /> Send message
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
