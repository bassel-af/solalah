import nodemailer from 'nodemailer';
import { assertProductionSafe } from './transport-guard';

const globalForTransport = globalThis as unknown as { emailTransport: nodemailer.Transporter };

function createTransport() {
  assertProductionSafe();
  const host = (process.env.SMTP_HOST || '').trim();
  const isMailpit = host === 'localhost' || host === '127.0.0.1' || host === 'mailpit';
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    // Mailpit and other loopback mail traps don't require auth; omit credentials
    // so nodemailer doesn't try AUTH against a server that doesn't advertise it.
    auth: isMailpit && !process.env.SMTP_USER
      ? undefined
      : {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
  });
}

export const emailTransport = globalForTransport.emailTransport || createTransport();

if (process.env.NODE_ENV !== 'production') {
  globalForTransport.emailTransport = emailTransport;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Admin-dashboard health probe. Thin wrapper around the transport's
 * `.verify()` method — nodemailer opens a connection, issues EHLO / STARTTLS
 * negotiation, and returns true if the server is reachable and willing to
 * accept mail. Any failure throws (caller must wrap in try/catch).
 */
export async function verifyMailTransport(): Promise<true> {
  await emailTransport.verify();
  return true;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  // Runtime guard: refuse to deliver if prod env is paired with a mail-trap host.
  // Checked per-send (not just at transport creation) so env drift can't slip past.
  assertProductionSafe();

  const senderEmail = process.env.SMTP_SENDER_EMAIL || 'noreply@gynat.com';
  const senderName = process.env.SMTP_SENDER_NAME || 'جينات';

  return emailTransport.sendMail({
    from: `"${senderName}" <${senderEmail}>`,
    to,
    subject,
    html,
    text,
  });
}
