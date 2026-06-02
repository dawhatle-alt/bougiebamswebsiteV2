import { Router, type IRouter } from "express";
import healthRouter from "./health";
import emailRouter from "./email";
import subscribeRouter from "./subscribe";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(emailRouter);
router.use(subscribeRouter);
router.use(adminRouter);

export default router;
