import { Router, type IRouter } from "express";
import healthRouter from "./health";
import careerRouter from "./career";
import jobsRouter from "./jobs";
import dosmRouter from "./dosm";
import analysisRouter from "./analysis";

const router: IRouter = Router();

router.use(healthRouter);
router.use(careerRouter);
router.use(jobsRouter);
router.use(dosmRouter);
router.use(analysisRouter);

export default router;
