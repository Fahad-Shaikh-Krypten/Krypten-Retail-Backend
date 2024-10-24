import express from "express";
import { tryCatchWrapper } from "../utils/Functions.js";
import { addCarousel , getCarousels , deleteCarousel} from "../utils/Carousel.js";
import { authenticateToken } from "../middlewares/Functions.js";
import { upload } from "../middlewares/Functions.js";


const router = express.Router();

router.post("/new",authenticateToken,upload.single("image"), tryCatchWrapper(addCarousel));
router.get("/", tryCatchWrapper(getCarousels));
router.delete("/:id", tryCatchWrapper(deleteCarousel));

export default router;