import { Router, type IRouter } from "express";
import { SendContactEmailBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/email/contact", async (req, res): Promise<void> => {
  const parsed = SendContactEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, subject, message } = parsed.data;

  logger.info({ name, email, subject }, "Contact form submission received");

  res.json({ message: "Message received. We will get back to you shortly." });
});

export default router;
