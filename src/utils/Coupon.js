import Coupon from "../models/Coupon.js";
import { encryptData, decryptData } from "../utils/Encryption.js";

export const createCoupon = async (req, res) => {
    const { encryptedData} = req.body;
    const decryptedData = decryptData(encryptedData);
    const parsedData = JSON.parse(decryptedData);
    const { name , expirationDate , discountType , discountValue , minimumPurchaseAmount} = parsedData;
    const newCoupon = new Coupon({
        name,
        expirationDate,
        discountType,
        discountValue,
        minimumPurchaseAmount
    });
    await newCoupon.save();
    const encryptedResponse = encryptData(JSON.stringify(newCoupon));
    res.status(201).json({ success: true, data: encryptedResponse });
};

export const getCoupons = async (req, res) => {
    const { encryptedData } = req.body;
    const decryptedData = decryptData(encryptedData);
    const parsedData = JSON.parse(decryptedData);
    const { page = 1, perPage = 10 } = parsedData;
    const coupons = await Coupon.find().skip((page - 1) * perPage).limit(perPage);
    const total = await Coupon.countDocuments();
    const encryptedResponse = encryptData(JSON.stringify({ coupons, total }));
    res.status(200).json({ success: true, data: encryptedResponse });
}

export const getCoupon = async (req, res) => {
    const { encryptedData } = req.body;
    const decryptedData = decryptData(encryptedData);
    const parsedData = JSON.parse(decryptedData);
    const { id } = parsedData;
    const coupon = await Coupon.findById(id);
    const encryptedResponse = encryptData(JSON.stringify(coupon));
    res.status(200).json({ success: true, data: encryptedResponse });
}   

export const applyCoupon = async (req, res) => {
    const { encryptedData } = req.body;
    const decryptedData = decryptData(encryptedData);
    const parsedData = JSON.parse(decryptedData);
    const { couponCode, total } = parsedData;
    const coupon = await Coupon.findOne({ name: couponCode });
    if (!coupon) {
        return res.json({ error: 'Coupon not found' });
    }
    if (coupon.expirationDate < Date.now()) {
        return res.json({ error: 'Coupon expired' });
    }

    if (coupon.minimumPurchaseAmount > total) {
        return res.json({ error: 'Minimum purchase amount not met' });
    }
    if (coupon.discountType === 'percentage') {
        const discount = (total * coupon.discountValue) / 100;
        return res.status(200).json({ success: true, message: 'Coupon applied', discount });
    }
    if (coupon.discountType === 'fixed') {
        return res.status(200).json({ success: true, message: 'Coupon applied', discount: coupon.discountValue });
    }
}   

export const deleteCoupon = async (req, res) => {
    const id = req.params.id;
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
}