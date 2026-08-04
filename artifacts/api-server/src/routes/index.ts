import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sportsRouter from "./sports";
import bookmakersRouter from "./bookmakers";
import eventsRouter from "./events";
import oddsRouter from "./odds";
import opportunitiesRouter from "./opportunities";
import seedRouter from "./seed";
import realOddsRouter from "./real-odds";
import predictionsRouter from "./predictions";
import accumulatorRouter from "./accumulator";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sportsRouter);
router.use(bookmakersRouter);
router.use(eventsRouter);
router.use(oddsRouter);
router.use(opportunitiesRouter);
router.use(seedRouter);
router.use(realOddsRouter);
router.use(predictionsRouter);
router.use(accumulatorRouter);

export default router;
