import express from "express";
import { tryCatchWrapper } from "../utils/Functions.js";
import { newReview , getReviews , deleteReview } from "../utils/Review.js";
import { authenticateToken, upload } from "../middlewares/Functions.js";


const router = express.Router();

router.post("/new",upload.array("images"), authenticateToken, tryCatchWrapper(newReview));

router.get("/", tryCatchWrapper(getReviews));

router.delete("/", authenticateToken, tryCatchWrapper(deleteReview));

export default router;