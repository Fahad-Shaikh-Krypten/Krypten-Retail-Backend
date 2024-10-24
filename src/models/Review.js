// models/Review.js

import mongoose from 'mongoose';
import Product from './Product.js';
import User from './User.js';  // Ensure the correct path

const { Schema, model } = mongoose;

const reviewSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  images: {
    type: [
      {
        url: { type: String, required: true },
        alt_text: { type: String }
      }
    ],
    default: []
  },
  created_at: {
    type: Date,
    default: () => Date.now(),
    immutable: true
  },
  updated_at: { type: Date, default: () => Date.now() }
});

// Static method to calculate and update the average rating for a product
reviewSchema.statics.calculateAverageRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' } } }
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, { rating: stats[0].avgRating });
  } else {
    await Product.findByIdAndUpdate(productId, { rating: 0 }); // or set to undefined if you prefer
  }
};

// Middleware to update product rating after saving a review
reviewSchema.post('save', async function () {
  await this.constructor.calculateAverageRating(this.product);
});

// Middleware to update product rating after removing a review
reviewSchema.post('remove', async function () {
  await this.constructor.calculateAverageRating(this.product);
});

reviewSchema.index({ product: 'text', user: 'text'});

const Review = model('Review', reviewSchema);

export default Review;
