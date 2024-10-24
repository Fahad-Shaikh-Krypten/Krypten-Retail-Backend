import express from "express";
import { tryCatchWrapper } from "../utils/Functions.js";
import { createCoupon, getCoupons, getCoupon ,applyCoupon ,deleteCoupon} from "../utils/Coupon.js";
import { authenticateToken } from "../middlewares/Functions.js";


const router = express.Router();


router.post("/new",authenticateToken, tryCatchWrapper(createCoupon));

router.post("/all", tryCatchWrapper(getCoupons));

router.post("/apply",authenticateToken, tryCatchWrapper(applyCoupon));

router.delete("/:id", tryCatchWrapper(deleteCoupon));

export default router;