import { Router, type IRouter } from "express";
import healthRouter from "./health";
import emailRouter from "./email";
import subscribeRouter from "./subscribe";
import adminRouter from "./admin";
import productsRouter from "./products";
import blogRouter from "./blog";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(emailRouter);
router.use(subscribeRouter);
router.use(adminRouter);
router.use(productsRouter);
router.use(blogRouter);
router.use(storageRouter);

export default router;
