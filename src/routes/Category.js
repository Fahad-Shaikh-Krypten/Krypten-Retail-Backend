import { upload } from "../middlewares/Functions.js";
import {getCategories , getPriceCategory ,getSimpleCategory, createCategory, getAllCategories, getCategory , updateCategory, deleteCategory} from "../utils/Category.js";
import { tryCatchWrapper } from "../utils/Functions.js";
import express from "express";


const router = express.Router();


router.post("/new",upload.single("image"), tryCatchWrapper(createCategory));
router.post("/all", tryCatchWrapper(getCategories));
router.get("/simple", tryCatchWrapper(getSimpleCategory));
router.get("/price", tryCatchWrapper(getPriceCategory));
router.get("/user",tryCatchWrapper(getAllCategories))
router.post("/", tryCatchWrapper(getCategory));
router.put("/:id",upload.single("image"), tryCatchWrapper(updateCategory));
router.delete("/:id", tryCatchWrapper(deleteCategory));



export default router;
