import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authorizationRouter from "./authorization";
import samBooksRouter from "./sam-books";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authorizationRouter);
router.use(samBooksRouter);
router.use(aiRouter);

export default router;
