import { Router, type IRouter } from "express";
import healthRouter from "./health";
import emailRouter from "./email";
import subscribeRouter from "./subscribe";

const router: IRouter = Router();

router.use(healthRouter);
router.use(emailRouter);
router.use(subscribeRouter);

export default router;
