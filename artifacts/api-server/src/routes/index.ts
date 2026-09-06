import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authorizationRouter from "./authorization";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authorizationRouter);

export default router;
