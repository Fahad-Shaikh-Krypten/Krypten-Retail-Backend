import express from "express";
import { tryCatchWrapper } from "../utils/Functions.js";
import { getPieCharts ,getBarCharts, getDashboardStats , getLineCharts } from "../utils/stats.js";
import { authenticateToken } from "../middlewares/Functions.js";


const router = express.Router();


router.get("/pie-stats",authenticateToken, tryCatchWrapper(getPieCharts));
router.get("/bar-stats",authenticateToken, tryCatchWrapper(getBarCharts));
router.get("/line-stats",authenticateToken, tryCatchWrapper(getLineCharts));
router.get("/dashboard-stats",authenticateToken, tryCatchWrapper(getDashboardStats));


export default router;