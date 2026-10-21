import { Router, type IRouter } from "express";
import healthRouter from "./health";
import careerRouter from "./career";
import jobsRouter from "./jobs";
import dosmRouter from "./dosm";
import analysisRouter from "./analysis";
import signalsRouter from "./signals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(careerRouter);
router.use(jobsRouter);
router.use(dosmRouter);
router.use(analysisRouter);
router.use(signalsRouter);

export default router;
