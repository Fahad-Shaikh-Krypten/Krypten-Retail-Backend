import Review from "../models/Review.js";
import User from "../models/User.js"; 
import { decryptData, encryptData } from "./Encryption.js";

// Fetch reviews for a specific product
export const getReviews = async (req, res) => {
    const { product } = req.query;
    const decryptedData = decryptData(product);
    const parsedData = JSON.parse(decryptedData);
    const { product_id } = parsedData;
        const reviews = await Review.find({ product: product_id }).populate('user');
        const encryptedResponse = encryptData(JSON.stringify(reviews));
        res.status(200).json({
            success: true,
            data: encryptedResponse
        });
};

// Create a new review for a specific product
export const newReview = async (req, res) => {
    const { product_id, rating, comment } = req.body;
    const images = req.files;
    const user = req.user.id
    
        const mappedImages = images.map(image => ({
            url: image.path,
            alt_text: `Review - ${user}`
        }));

        const review = await Review.create({
            product: product_id,
            user,
            rating,
            comment,
            images: mappedImages
        });

        res.status(201).json({
            success: true,
            data: review
        });
};


export const deleteReview = async (req, res) => {
    const { encryptedData } = req.body;
    const decryptedData = JSON.parse(decryptData(encryptedData));
    const { review_id } = decryptedData;
    await Review.findByIdAndDelete(review_id);
    res.status(200).json({
        success: true,
    });
}