import express from "express";
import { tryCatchWrapper } from "../utils/Functions.js";
import {authenticateToken} from "../middlewares/Functions.js";
import { getCart , addCartItem , updateQuantity, deleteCartItem, mergeCart} from "../utils/Cart.js";

import cookieParser from 'cookie-parser';



const router = express.Router();

router.use(cookieParser());

router.post("/add",authenticateToken, tryCatchWrapper(addCartItem));

router.get("/",authenticateToken, tryCatchWrapper(getCart));

router.put("/update",authenticateToken, tryCatchWrapper(updateQuantity));

router.post("/merge",authenticateToken, tryCatchWrapper(mergeCart));

router.delete("/",authenticateToken, tryCatchWrapper(deleteCartItem));




export default router;