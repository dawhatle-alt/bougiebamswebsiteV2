import { Router } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";

const router = Router();
const connectors = new ReplitConnectors();

const PATSY_EMAIL = "patsy@bougiebams.com";
const FROM_ADDRESS = "BougieBams <onboarding@resend.dev>";

router.post("/email/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const response = await connectors.proxy("resend", "/emails", {
      method: "POST",
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [PATSY_EMAIL],
        reply_to: email,
        subject: `BougieBams Contact: ${subject} — from ${name}`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1A1E2E;">
            <div style="background: #1F2847; padding: 32px; text-align: center;">
              <h1 style="color: #D4A017; font-size: 28px; margin: 0; letter-spacing: 2px;">BougieBams</h1>
              <p style="color: rgba(245,240,234,0.7); margin: 8px 0 0; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">New Contact Form Message</p>
            </div>
            <div style="padding: 32px; background: #FAF8F5; border: 1px solid #E2DBD3;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-size: 11px; font-family: Inter, sans-serif; letter-spacing: 2px; text-transform: uppercase; color: #686E7A; width: 80px;">From</td>
                  <td style="padding: 8px 0; font-size: 16px;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 11px; font-family: Inter, sans-serif; letter-spacing: 2px; text-transform: uppercase; color: #686E7A;">Email</td>
                  <td style="padding: 8px 0; font-size: 16px;"><a href="mailto:${email}" style="color: #D4A017;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 11px; font-family: Inter, sans-serif; letter-spacing: 2px; text-transform: uppercase; color: #686E7A;">Subject</td>
                  <td style="padding: 8px 0; font-size: 16px;">${subject}</td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #E2DBD3; margin: 24px 0;" />
              <p style="font-size: 11px; font-family: Inter, sans-serif; letter-spacing: 2px; text-transform: uppercase; color: #686E7A; margin-bottom: 12px;">Message</p>
              <p style="font-size: 16px; line-height: 1.7; white-space: pre-wrap; margin: 0;">${message}</p>
            </div>
            <div style="padding: 20px 32px; background: #1F2847; text-align: center;">
              <p style="color: rgba(245,240,234,0.5); font-size: 12px; margin: 0; font-family: Inter, sans-serif;">BougieBams · Where Style Meets the Table</p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Resend error ${response.status}: ${text}`);
    }

    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to send contact email");
    return res.status(500).json({ error: "Failed to send email" });
  }
});

router.post("/email/event-registration", async (req, res) => {
  const { name, email, eventTitle, eventDate, eventLocation, eventPrice } = req.body;

  if (!name || !email || !eventTitle) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const priceDisplay = eventPrice === "Free" ? "Free" : `$${eventPrice}`;

  try {
    const [notifyResp, confirmResp] = await Promise.all([
      connectors.proxy("resend", "/emails", {
        method: "POST",
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [PATSY_EMAIL],
          reply_to: email,
          subject: `New Event Registration: ${eventTitle}`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1A1E2E;">
              <div style="background: #1F2847; padding: 32px; text-align: center;">
                <h1 style="color: #D4A017; font-size: 28px; margin: 0; letter-spacing: 2px;">BougieBams</h1>
                <p style="color: rgba(245,240,234,0.7); margin: 8px 0 0; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">New Event Registration</p>
              </div>
              <div style="padding: 32px; background: #FAF8F5; border: 1px solid #E2DBD3;">
                <h2 style="font-size: 22px; margin: 0 0 24px; color: #D4A017;">${eventTitle}</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-size: 11px; font-family: Inter, sans-serif; letter-spacing: 2px; text-transform: uppercase; color: #686E7A; width: 80px;">Guest</td>
                    <td style="padding: 8px 0; font-size: 16px;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 11px; font-family: Inter, sans-serif; letter-spacing: 2px; text-transform: uppercase; color: #686E7A;">Email</td>
                    <td style="padding: 8px 0; font-size: 16px;"><a href="mailto:${email}" style="color: #D4A017;">${email}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 11px; font-family: Inter, sans-serif; letter-spacing: 2px; text-transform: uppercase; color: #686E7A;">Date</td>
                    <td style="padding: 8px 0; font-size: 16px;">${eventDate ?? ""}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 11px; font-family: Inter, sans-serif; letter-spacing: 2px; text-transform: uppercase; color: #686E7A;">Location</td>
                    <td style="padding: 8px 0; font-size: 16px;">${eventLocation ?? ""}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 11px; font-family: Inter, sans-serif; letter-spacing: 2px; text-transform: uppercase; color: #686E7A;">Price</td>
                    <td style="padding: 8px 0; font-size: 16px; font-weight: bold;">${priceDisplay}</td>
                  </tr>
                </table>
              </div>
              <div style="padding: 20px 32px; background: #1F2847; text-align: center;">
                <p style="color: rgba(245,240,234,0.5); font-size: 12px; margin: 0; font-family: Inter, sans-serif;">BougieBams · Where Style Meets the Table</p>
              </div>
            </div>
          `,
        }),
      }),
      connectors.proxy("resend", "/emails", {
        method: "POST",
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [email],
          subject: `You're registered: ${eventTitle}`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1A1E2E;">
              <div style="background: #1F2847; padding: 32px; text-align: center;">
                <h1 style="color: #D4A017; font-size: 28px; margin: 0; letter-spacing: 2px;">BougieBams</h1>
              </div>
              <div style="padding: 40px 32px; background: #FAF8F5; border: 1px solid #E2DBD3; text-align: center;">
                <p style="font-size: 13px; font-family: Inter, sans-serif; letter-spacing: 2px; text-transform: uppercase; color: #D4A017; margin: 0 0 16px;">You're confirmed</p>
                <h2 style="font-size: 28px; margin: 0 0 8px;">${eventTitle}</h2>
                <p style="font-size: 16px; color: #686E7A; margin: 0 0 32px;">We can't wait to see you, ${name.split(" ")[0]}.</p>
                <div style="background: white; border: 1px solid #E2DBD3; border-radius: 4px; padding: 24px; text-align: left; display: inline-block; min-width: 280px;">
                  ${eventDate ? `<p style="margin: 0 0 8px; font-size: 14px;"><span style="color: #D4A017;">📅</span> ${eventDate}</p>` : ""}
                  ${eventLocation ? `<p style="margin: 0 0 8px; font-size: 14px;"><span style="color: #D4A017;">📍</span> ${eventLocation}</p>` : ""}
                  <p style="margin: 0; font-size: 14px; font-weight: bold;">${priceDisplay}</p>
                </div>
              </div>
              <div style="padding: 20px 32px; background: #1F2847; text-align: center;">
                <p style="color: rgba(245,240,234,0.5); font-size: 12px; margin: 0; font-family: Inter, sans-serif;">BougieBams · Where Style Meets the Table</p>
                <p style="color: rgba(245,240,234,0.35); font-size: 11px; margin: 8px 0 0; font-family: Inter, sans-serif;">Questions? Reply to this email or reach us at patsy@bougiebams.com</p>
              </div>
            </div>
          `,
        }),
      }),
    ]);

    if (!notifyResp.ok || !confirmResp.ok) {
      throw new Error("One or more Resend requests failed");
    }

    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to send event registration emails");
    return res.status(500).json({ error: "Failed to send email" });
  }
});

export default router;
