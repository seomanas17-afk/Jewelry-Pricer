import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import metalPricesRouter from "./metalPrices.js";
import settingsRouter from "./settings.js";
import calculatorRouter from "./calculator.js";
import historyRouter from "./history.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/metal-prices", metalPricesRouter);
router.use("/settings", settingsRouter);
router.use("/calculator", calculatorRouter);
router.use("/history", historyRouter);

export default router;
