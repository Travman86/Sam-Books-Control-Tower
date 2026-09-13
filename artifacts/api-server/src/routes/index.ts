import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import authorizationRouter from "./authorization";
import samBooksRouter from "./sam-books";
import aiRouter from "./ai";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(authorizationRouter);
router.use(samBooksRouter);
router.use(aiRouter);
router.use(storageRouter);

export default router;
