import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sportsRouter from "./sports";
import bookmakersRouter from "./bookmakers";
import eventsRouter from "./events";
import oddsRouter from "./odds";
import opportunitiesRouter from "./opportunities";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sportsRouter);
router.use(bookmakersRouter);
router.use(eventsRouter);
router.use(oddsRouter);
router.use(opportunitiesRouter);

export default router;
