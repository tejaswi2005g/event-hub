import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import eventsRouter from "./events";
import registrationsRouter from "./registrations";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(eventsRouter);
router.use(registrationsRouter);
router.use(adminRouter);

export default router;
