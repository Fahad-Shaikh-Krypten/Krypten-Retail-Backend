import express from "express";
import { tryCatchWrapper } from "../utils/Functions.js";
import { getAllUsers, getUser, getUserDetails,updateUserDetails ,deleteUser} from "../utils/Users.js";
import {authenticateToken} from "../middlewares/Functions.js";

const router = express.Router();

router.post("/all", tryCatchWrapper(getAllUsers));

router.post("/",authenticateToken, tryCatchWrapper(getUser));

router.get("/",authenticateToken, tryCatchWrapper(getUserDetails));

router.put("/",authenticateToken, tryCatchWrapper(updateUserDetails));

router.delete("/:id", tryCatchWrapper(deleteUser));



export default router;