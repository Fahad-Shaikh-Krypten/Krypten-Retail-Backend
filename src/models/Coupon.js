import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    maxLength: 25
  },
  expirationDate: {
    type: Date,
    required: true
  },
  discountType: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed'] 
  },
  discountValue: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  minimumPurchaseAmount: {
    type: Number,
    default: 0
  }
});

// Pre-save hook to update the updatedAt field
couponSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});


const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;