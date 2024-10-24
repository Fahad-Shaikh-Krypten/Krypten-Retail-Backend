import express from "express";
import { tryCatchWrapper } from "../utils/Functions.js";
import { createOrder , getAllOrders , updatePaymentStatus , myOrders , cancelOrder , verifyPayment, bestSellers, updateOrderStatus , getShippingCharge , downloadInvoice, trackOrder, updateManualOrderStatus} from "../utils/Order.js";
import { authenticateToken, upload } from "../middlewares/Functions.js";

const router = express.Router();

router.post("/new",authenticateToken, tryCatchWrapper(createOrder));
router.post("/updatePayment",authenticateToken, tryCatchWrapper(updatePaymentStatus));
router.post("/shippingCharge",authenticateToken, tryCatchWrapper(getShippingCharge));
router.post("/", tryCatchWrapper(getAllOrders));
router.post("/verify", tryCatchWrapper(verifyPayment));
router.post("/cancel",authenticateToken, tryCatchWrapper(cancelOrder));
router.get("/my-orders",authenticateToken, tryCatchWrapper(myOrders));
router.get("/best-sellers", tryCatchWrapper(bestSellers));
router.post("/status",tryCatchWrapper(updateOrderStatus));
router.post("/manual-status",tryCatchWrapper(updateManualOrderStatus));
router.post("/invoice", tryCatchWrapper(downloadInvoice));
router.post("/track", tryCatchWrapper(trackOrder))

export default router