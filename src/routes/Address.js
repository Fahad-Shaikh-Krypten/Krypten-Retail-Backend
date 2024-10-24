import express from "express";
import { tryCatchWrapper } from "../utils/Functions.js";
import { addAddress, getAddresses , deleteAddress,editAddress } from "../utils/Address.js";
import {authenticateToken} from "../middlewares/Functions.js";


const router = express.Router();

router.get("/",authenticateToken, tryCatchWrapper(getAddresses));

router.post("/",authenticateToken, tryCatchWrapper(addAddress));

router.put("/",authenticateToken, tryCatchWrapper(editAddress));

router.delete("/", tryCatchWrapper(deleteAddress));

export default router;