import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import metalPricesRouter from "./metalPrices.js";
import calculatorRouter from "./calculator.js";
import historyRouter from "./history.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/metal-prices", metalPricesRouter);
router.use("/calculator", calculatorRouter);
router.use("/history", historyRouter);

export default router;
