import nodemailer from 'nodemailer';

const globalForTransport = globalThis as unknown as { emailTransport: nodemailer.Transporter };

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
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

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const senderEmail = process.env.SMTP_SENDER_EMAIL || 'noreply@solalah.com';
  const senderName = process.env.SMTP_SENDER_NAME || 'سلالة';

  return emailTransport.sendMail({
    from: `"${senderName}" <${senderEmail}>`,
    to,
    subject,
    html,
    text,
  });
}
