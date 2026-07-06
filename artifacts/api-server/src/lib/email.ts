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

// Comma-separated list; ORDER_NOTIFY_EMAIL overrides the default recipients.
const ORDER_NOTIFY_EMAILS = (process.env.ORDER_NOTIFY_EMAIL ?? "patsy@bougiebams.com,darrell@bougiebams.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export async function sendOrderNotificationEmail(opts: {
  orderId: string;
  totalCents: number;
  currency: string;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  shippingAddress: string | null;
  items: { name: string; quantity: string; amountCents: number }[];
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  const { orderId, totalCents, currency, buyerName, buyerEmail, buyerPhone, shippingAddress, items } = opts;
  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const itemRowsHtml = items
    .map(
      (i) =>
        `<tr><td style="padding:4px 12px 4px 0">${esc(i.name)} × ${esc(i.quantity)}</td><td style="padding:4px 0;text-align:right"><strong>${money(i.amountCents)}</strong></td></tr>`,
    )
    .join("");
  const itemsText = items.map((i) => `- ${i.name} × ${i.quantity} — ${money(i.amountCents)}`).join("\n");
  const addressHtml = shippingAddress ? esc(shippingAddress).replace(/\n/g, "<br/>") : "Not provided";

  const { error } = await client.emails.send({
    from: FROM_EMAIL,
    to: ORDER_NOTIFY_EMAILS,
    ...(buyerEmail ? { replyTo: buyerEmail } : {}),
    subject: `New order ${money(totalCents)} — ${buyerName || buyerEmail || "Online store"}`,
    html: `${logoHeader}
      <h2>New order received 🎉</h2>
      <table style="border-collapse:collapse;margin:16px 0;min-width:320px">${itemRowsHtml}
        <tr><td style="padding:8px 12px 4px 0;border-top:1px solid #ddd"><strong>Total</strong></td><td style="padding:8px 0 4px;text-align:right;border-top:1px solid #ddd"><strong>${money(totalCents)} ${currency}</strong></td></tr>
      </table>
      <h3 style="margin-bottom:4px">Customer</h3>
      <p style="margin:4px 0">${esc(buyerName ?? "—")}<br/>${esc(buyerEmail ?? "—")}<br/>${esc(buyerPhone ?? "—")}</p>
      <h3 style="margin-bottom:4px">Ship to</h3>
      <p style="margin:4px 0">${addressHtml}</p>
      <p style="color:#888;font-size:12px;margin-top:16px">Square order: ${esc(orderId)}</p>
    `,
    text: `New order received\n\n${itemsText}\nTotal: ${money(totalCents)} ${currency}\n\nCustomer:\n${buyerName ?? "—"}\n${buyerEmail ?? "—"}\n${buyerPhone ?? "—"}\n\nShip to:\n${shippingAddress ?? "Not provided"}\n\nSquare order: ${orderId}`,
  });

  if (error) {
    logger.error({ error, orderId }, "Failed to send order notification email");
    throw new Error("Order notification email failed");
  }
  logger.info({ to: ORDER_NOTIFY_EMAILS, orderId }, "Order notification email sent");
}

export async function sendCheckinReportEmail(opts: {
  to: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  participants: { name: string; email: string; status: string; paid: boolean }[];
  csv: string;
  csvFilename: string;
}): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Email delivery is not configured (RESEND_API_KEY missing)");

  const { to, eventTitle, eventDate, eventTime, eventLocation, participants, csv, csvFilename } = opts;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const rowsHtml = participants
    .map(
      (p, i) =>
        `<tr>
          <td style="padding:4px 10px;border-bottom:1px solid #eee">${i + 1}</td>
          <td style="padding:4px 10px;border-bottom:1px solid #eee"><strong>${esc(p.name)}</strong></td>
          <td style="padding:4px 10px;border-bottom:1px solid #eee">${esc(p.email)}</td>
          <td style="padding:4px 10px;border-bottom:1px solid #eee">${esc(p.status)}</td>
          <td style="padding:4px 10px;border-bottom:1px solid #eee">${p.paid ? "Paid" : "Free"}</td>
        </tr>`,
    )
    .join("");

  const { error } = await client.emails.send({
    from: FROM_EMAIL,
    to: [to],
    replyTo: CONTACT_EMAIL,
    subject: `Check-in list: ${eventTitle} (${participants.length} registered)`,
    html: `${logoHeader}
      <h2>Check-in list — ${esc(eventTitle)}</h2>
      <p style="margin:4px 0;color:#555">${esc(eventDate)} · ${esc(eventTime)}<br/>${esc(eventLocation)}</p>
      <p><strong>${participants.length}</strong> registered participant${participants.length === 1 ? "" : "s"}. A CSV with a check-in column is attached.</p>
      <table style="border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr>
          <th style="padding:4px 10px;text-align:left;border-bottom:2px solid #1E2A5A">#</th>
          <th style="padding:4px 10px;text-align:left;border-bottom:2px solid #1E2A5A">Name</th>
          <th style="padding:4px 10px;text-align:left;border-bottom:2px solid #1E2A5A">Email</th>
          <th style="padding:4px 10px;text-align:left;border-bottom:2px solid #1E2A5A">Status</th>
          <th style="padding:4px 10px;text-align:left;border-bottom:2px solid #1E2A5A">Paid</th>
        </tr>
        ${rowsHtml}
      </table>
    `,
    text: `Check-in list — ${eventTitle}\n${eventDate} · ${eventTime}\n${eventLocation}\n\n${participants.length} registered.\n\n${participants.map((p, i) => `${i + 1}. ${p.name} <${p.email}> — ${p.status}${p.paid ? " (paid)" : ""}`).join("\n")}`,
    attachments: [
      {
        filename: csvFilename,
        content: Buffer.from(csv, "utf8"),
        contentType: "text/csv",
      },
    ],
  });

  if (error) {
    logger.error({ error, to, eventTitle }, "Failed to send check-in report email");
    throw new Error("Check-in report email failed");
  }
  logger.info({ to, eventTitle, count: participants.length }, "Check-in report email sent");
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
