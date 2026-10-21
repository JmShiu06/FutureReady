import { Router, type IRouter } from "express";
import healthRouter from "./health";
import careerRouter from "./career";
import jobsRouter from "./jobs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(careerRouter);
router.use(jobsRouter);

export default router;
