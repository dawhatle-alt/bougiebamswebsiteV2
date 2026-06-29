import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import eventsRouter from "./events";
import blogRouter from "./blog";
import subscribersRouter from "./subscribers";
import registrationsRouter from "./registrations";
import contactRouter from "./contact";
import adminRouter from "./admin";
import storageRouter from "./storage";
import authRouter from "./auth";
import checkoutRouter from "./checkout";
import emailRouter from "./email";
import stripeRouter from "./stripe";
import couponsRouter from "./coupons";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(productsRouter);
router.use(eventsRouter);
router.use(blogRouter);
router.use(subscribersRouter);
router.use(registrationsRouter);
router.use(contactRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(checkoutRouter);
router.use(emailRouter);
router.use(stripeRouter);
router.use(couponsRouter);

export default router;
