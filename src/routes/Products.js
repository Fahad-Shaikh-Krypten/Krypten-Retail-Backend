import express from "express";
import { upload, validateSearch } from "../middlewares/Functions.js";
import { tryCatchWrapper } from "../utils/Functions.js";
import { newProduct , getAllProducts , getProductRating , getProduct ,getCategories , getlatestProducts, getProductsByPrice , getProductsByCategory , updateProduct,getAutocompleteSuggestions , getSimilarProducts , deleteProduct} from "../utils/Products.js";
import Product from "../models/Product.js";


const router = express.Router();

router.post("/all",validateSearch, tryCatchWrapper(getAllProducts));

router.get("/latest-products", tryCatchWrapper(getlatestProducts));


router.post("/new",upload.array("images"), tryCatchWrapper(newProduct));

router.get("/categories", tryCatchWrapper(getCategories));

router.post("/price",tryCatchWrapper(getProductsByPrice));

router.post("/category",tryCatchWrapper(getProductsByCategory));

router.post("/page", tryCatchWrapper(getProduct));

router.put("/page/:id", upload.fields([
    { name: 'new_images', maxCount: 10 },
    { name: 'edited_images', maxCount: 10 }
  ]), tryCatchWrapper(updateProduct));

router.delete("/page/:id", tryCatchWrapper(deleteProduct));

router.get('/autocomplete', tryCatchWrapper(getAutocompleteSuggestions));

router.get('/similar', tryCatchWrapper(getSimilarProducts));

export default router;


