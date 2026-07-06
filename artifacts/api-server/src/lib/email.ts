import { Resend } from "resend";
import { logger } from "./logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM ?? process.env.FROM_EMAIL ?? "noreply@bougiebams.com";
const CONTACT_EMAIL = process.env.OWNER_EMAIL ?? process.env.CONTACT_EMAIL ?? "hello@bougiebams.com";

const WEB_ORIGIN = (process.env.PUBLIC_WEB_ORIGIN ?? "https://bougiebams.com").replace(/\/$/, "");
const LOGO_URL = `${WEB_ORIGIN}/bougiebams-logo-transparent.png`;

// Branded header for customer-facing emails. Uses the width attribute (respected
// by most email clients) alongside inline styles, since email CSS support is spotty.
const logoHeader = `
      <div style="text-align:center;padding:8px 0 16px">
        <img src="${LOGO_URL}" alt="BougieBams" width="180" style="width:180px;max-width:60%;height:auto;border:0;outline:none;text-decoration:none" />
      </div>`;

function getClient(): Resend | null {
  if (!RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY is not set — email delivery is disabled");
    return null;
  }
  return new Resend(RESEND_API_KEY);
}

export async function sendContactEmail(opts: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  const { name, email, subject, message } = opts;
  const safeMsg = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const { error } = await client.emails.send({
    from: FROM_EMAIL,
    to: [CONTACT_EMAIL],
    replyTo: email,
    subject: `[Contact] ${subject}`,
    html: `
      <h2>New contact message from ${name}</h2>
      <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <hr />
      <p style="white-space:pre-wrap">${safeMsg}</p>
    `,
    text: `New contact message from ${name} <${email}>\nSubject: ${subject}\n\n${message}`,
  });

  if (error) {
    logger.error({ error }, "Failed to send contact email");
  } else {
    logger.info({ to: CONTACT_EMAIL, from: email }, "Contact email sent");
  }
}

export async function sendRegistrationConfirmationEmail(opts: {
  registrantName: string;
  registrantEmail: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventHost: string;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  const { registrantName, registrantEmail, eventTitle, eventDate, eventTime, eventLocation, eventHost } = opts;

  const { error } = await client.emails.send({
    from: FROM_EMAIL,
    to: [registrantEmail],
    replyTo: CONTACT_EMAIL,
    subject: `You're registered for ${eventTitle}!`,
    html: `${logoHeader}
      <h2>You're registered! 🎉</h2>
      <p>Hi ${registrantName},</p>
      <p>Your spot is confirmed for <strong>${eventTitle}</strong>.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 12px 4px 0;color:#666">Date</td><td style="padding:4px 0"><strong>${eventDate}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Time</td><td style="padding:4px 0"><strong>${eventTime}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Location</td><td style="padding:4px 0"><strong>${eventLocation}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Host</td><td style="padding:4px 0"><strong>${eventHost}</strong></td></tr>
      </table>
      <p>If you have any questions, reply to this email or reach us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
      <p>See you there!<br/>— The BougieBams Team</p>
    `,
    text: `Hi ${registrantName},\n\nYour spot is confirmed for ${eventTitle}.\n\nDate: ${eventDate}\nTime: ${eventTime}\nLocation: ${eventLocation}\nHost: ${eventHost}\n\nQuestions? Email us at ${CONTACT_EMAIL}.\n\nSee you there!\n— The BougieBams Team`,
  });

  if (error) {
    logger.error({ error, to: registrantEmail }, "Failed to send registration confirmation email");
  } else {
    logger.info({ to: registrantEmail, event: eventTitle }, "Registration confirmation email sent");
  }
}

export async function sendReminderEmail(opts: {
  registrantName: string;
  registrantEmail: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventHost: string;
  hoursUntilEvent: number;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  const { registrantName, registrantEmail, eventTitle, eventDate, eventTime, eventLocation, eventHost, hoursUntilEvent } = opts;

  const timeLabel =
    hoursUntilEvent >= 168 ? `${Math.round(hoursUntilEvent / 168)} week` :
    hoursUntilEvent >= 48 ? `${Math.round(hoursUntilEvent / 24)} days` :
    hoursUntilEvent >= 24 ? "1 day" :
    hoursUntilEvent >= 2 ? `${hoursUntilEvent} hours` : "1 hour";

  const { error } = await client.emails.send({
    from: FROM_EMAIL,
    to: [registrantEmail],
    replyTo: CONTACT_EMAIL,
    subject: `Reminder: ${eventTitle} is ${timeLabel} away!`,
    html: `${logoHeader}
      <h2>See you soon! 🀄</h2>
      <p>Hi ${registrantName},</p>
      <p>Just a reminder — <strong>${eventTitle}</strong> is coming up in <strong>${timeLabel}</strong>.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 12px 4px 0;color:#666">Date</td><td style="padding:4px 0"><strong>${eventDate}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Time</td><td style="padding:4px 0"><strong>${eventTime}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Location</td><td style="padding:4px 0"><strong>${eventLocation}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Host</td><td style="padding:4px 0"><strong>${eventHost}</strong></td></tr>
      </table>
      <p>If you have any questions, reply to this email or reach us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
      <p>Can't wait to see you!<br/>— The BougieBams Team</p>
    `,
    text: `Hi ${registrantName},\n\nJust a reminder — ${eventTitle} is coming up in ${timeLabel}.\n\nDate: ${eventDate}\nTime: ${eventTime}\nLocation: ${eventLocation}\nHost: ${eventHost}\n\nQuestions? Email us at ${CONTACT_EMAIL}.\n\nCan't wait to see you!\n— The BougieBams Team`,
  });

  if (error) {
    logger.error({ error, to: registrantEmail }, "Failed to send reminder email");
  } else {
    logger.info({ to: registrantEmail, event: eventTitle }, "Reminder email sent");
  }
}
