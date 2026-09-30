import { BRAND } from '@/brand/logoGeometry';
import { env } from '@/config/env';
import { routes } from '@/lib/links';
import { PageMeta } from '@/shared/components/PageMeta';

type Doc = 'privacy' | 'terms' | 'refund';

const UPDATED = '30 September 2026';

const DOCS: Record<Doc, { title: string; path: string; sections: { h: string; p: string[] }[] }> = {
  privacy: {
    title: 'Privacy policy',
    path: routes.privacy,
    sections: [
      {
        h: 'What we collect',
        p: [
          'Account: your name, email address and sign-in provider (Google or email link).',
          'Registrations: participant name, email, WhatsApp number, city, the course, amount, payment reference and the UPI transaction reference (UTR) you provide. We never collect card numbers, UPI PINs or bank passwords.',
          'Subscriptions: name, email and/or WhatsApp number, interests, and a record of your consent per channel (timestamp, source and the wording shown).',
          'Learning progress: which lessons you marked complete and your learning streak.',
          'Custom-app requests: the brief and contact details you submit.',
        ],
      },
      {
        h: 'Why we use it (purpose limitation)',
        p: [
          'To deliver the courses you register for, verify payments, send confirmations and class reminders, answer your requests, and — only if you consented — send announcements matching your interests.',
        ],
      },
      {
        h: 'Where it is stored',
        p: [
          'Data is stored in Google Firebase (Cloud Firestore) protected by security rules that restrict each record to you and to our administrators. Emails are sent through EmailJS. WhatsApp messages are sent manually by our team through WhatsApp.',
          'Your theme, sound and intro preferences are stored only in your own browser.',
        ],
      },
      {
        h: 'Your rights under the DPDP Act, 2023',
        p: [
          'You may access, correct or erase your personal data, withdraw consent at any time (every email has an unsubscribe link; reply STOP on WhatsApp), and nominate another person to exercise these rights. Use the contact form with the topic “Delete my data” or write to us. We respond within 30 days.',
        ],
      },
      {
        h: 'Retention',
        p: [
          'Registration and payment records are kept for 8 years for accounting purposes. Subscriber records are deleted within 30 days of an erasure request; unsubscribed records are kept only as a suppression list.',
        ],
      },
      { h: 'Contact / Grievance officer', p: [`${BRAND.name}, ${env.contact.email}`] },
    ],
  },
  terms: {
    title: 'Terms of use',
    path: routes.terms,
    sections: [
      { h: 'Accounts', p: ['You are responsible for the email account you sign in with. One registration is personal to one participant.'] },
      {
        h: 'Registrations & payments',
        p: [
          'A seat is held for 24 hours after you register. Pay the exact amount by UPI with your reference in the note and submit the UTR. Access is granted after we verify the payment. Submitting a UTR that is not yours is a breach of these terms.',
        ],
      },
      {
        h: 'Course content',
        p: ['Recordings, notes and links are for your personal learning only and may not be shared, resold or redistributed. We may revoke access in case of misuse.'],
      },
      { h: 'Conduct', p: ['Be kind and respectful in live sessions and community spaces. We may remove participants who disrupt learning.'] },
      { h: 'Changes', p: ['Schedules may occasionally change; we will inform registered participants in advance.'] },
      { h: 'Governing law', p: ['These terms are governed by the laws of India.'] },
    ],
  },
  refund: {
    title: 'Refund policy',
    path: routes.refund,
    sections: [
      { h: 'Live courses & events', p: ['Full refund if you cancel at least 48 hours before the first session. After that, you may transfer to a later cohort at no cost.'] },
      { h: 'Recorded courses', p: ['Full refund within 7 days of approval if you have completed less than 20% of the lessons.'] },
      { h: 'If we cancel', p: ['If we cancel or reschedule and you cannot attend, you receive a full refund.'] },
      { h: 'Rejected or unmatched payments', p: ['If we cannot match your payment, we will contact you; unmatched amounts are refunded to the source account within 7 working days.'] },
      { h: 'How to request', p: [`Use the contact form (topic: Payment) or email ${env.contact.email} with your reference number. Refunds are sent back via UPI to the paying account.`] },
    ],
  },
};

export default function LegalPage({ doc }: { doc: Doc }) {
  const d = DOCS[doc];
  return (
    <article className="container max-w-3xl py-12 sm:py-16">
      <PageMeta title={d.title} path={d.path} />
      <p className="eyebrow">Policies</p>
      <h1 className="mt-3 text-4xl font-semibold">{d.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {UPDATED}. This is a plain-language template — have it reviewed by a legal professional before launch.</p>
      <div className="mt-10 space-y-10">
        {d.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-2xl font-semibold">{s.h}</h2>
            {s.p.map((p) => (
              <p key={p} className="mt-3 text-[17px] leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
