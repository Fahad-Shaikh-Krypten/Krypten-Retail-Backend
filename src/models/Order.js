import mongoose from 'mongoose';
import User from './User.js';
import Product from './Product.js'; 
import cron from 'node-cron';
import Razorpay from 'razorpay'; // Import Razorpay SDK

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET_KEY,
});

const { Schema, model } = mongoose;

const statusSchema = new Schema({
  status: { 
    type: String, 
    required: true, 
    enum: [
      'Pending',     // Order is awaiting confirmation
      'Ordered', 
      'Pickup Scheduled', // Courier has scheduled a pickup
      'Picked Up',   // Package has been picked up
      'In Transit',  // Shipment is on the way
      'Out for Delivery', // Package is out for delivery
      'Delivered',   // Package has been delivered
      'Returned',    // Package has been returned
      'Cancelled',   // Order has been cancelled
      'Refunded'     // Order has been refunded
    ], 
    default: 'Pending' 
  },
  date: { type: Date, default: Date.now }
});


const refundSchema = new Schema({
  refund_id: { type: String }, // Razorpay refund ID
  amount: { type: Number }, // Refund amount
  status: { 
    type: String, 
    enum: ['Initiated', 'Processed', 'Failed'], 
    default: 'Initiated' 
  }, // Refund status
  date: { type: Date, default: Date.now } // Refund date
});

const orderSchema = new Schema({
  order_number: { type: String, required: true }, // Order number as a string
  shiprocketOrderId: { type: String }, 
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  order_date: { type: Date, default: Date.now },
  total_amount: { type: Number, required: true },
  items: [
    {
      product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],
  shipping_address: { type: Schema.Types.ObjectId, ref: 'Address', required: true },
  shipping_charges: { type: Number, required: true },
  payment_method: { type: String, enum: ['COD', 'Razorpay'], default: 'COD' },
  payment_id: { type: String }, // Razorpay payment ID
  discount:{type:Number,required:true,default:0},
  payment_status: { 
    type: String, 
    enum: ['Pending', 'Paid', 'Failed', 'Refunded'], 
    default: 'Pending' 
  }, // Payment status
  payment_date: { type: Date }, // Payment date based on the method
  status: [statusSchema], // Status array with dates
  refund: refundSchema // Refund details
});

orderSchema.index({ shiprocketOrderId: 1 });

// Pre-save hook to handle payment date and stock management
orderSchema.pre('save', async function(next) {
  try {
    const order = this;

    // Set payment date based on payment method
    if (order.payment_method === 'Razorpay' && order.payment_status === 'Paid') {
      order.payment_date = order.order_date; // Payment date is the order date
    } else if (order.payment_method === 'COD') {
      // Payment date will be set when the status is updated to 'Delivered'
      const deliveredStatus = order.status.find(s => s.status === 'Delivered');
      if (deliveredStatus) {
        order.payment_date = deliveredStatus.date;
      }
    }

    // Update product stock based on order status
    if (order.isModified('status')) {
      const orderedStatus = order.status.find(s => s.status === 'Ordered');
      const cancelledStatus = order.status.find(s => s.status === 'Cancelled');

      if (orderedStatus) {
        // Deduct stock
        await Promise.all(order.items.map(item =>
          Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } })
        ));
      }

      if (cancelledStatus) {
        // Add back stock
        await Promise.all(order.items.map(item =>
          Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })
        ));
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Method to handle order cancellation and refund
orderSchema.methods.cancelOrder = async function () {
  if (this.status[this.status.length - 1].status === 'Delivered') {
    throw new Error('Cannot cancel delivered order');
  }

  // Update order status
  this.status.push({ status: 'Cancelled', date: new Date() });
  
  // Update product stock
  await Promise.all(this.items.map(item =>
    Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })
  ));

  // Handle refund if payment method is Razorpay
  if (this.payment_method === 'Razorpay' && this.payment_status === 'Paid') {
    try {
      const refund = await razorpayInstance.payments.refund(this.payment_id, {
        amount: this.total_amount * 100, // Amount in paise
      });

      // Store refund details in the order
      this.refund = {
        refund_id: refund.id,
        amount: refund.amount / 100, // Convert to original currency
        status: refund.status === 'processed' ? 'Processed' : 'Failed',
        date: new Date(),
      };

      // Update payment status to 'Refunded' if the refund is processed
      if (refund.status === 'processed') {
        this.payment_status = 'Refunded';
      } else {
        throw new Error('Refund failed');
      }
    } catch (error) {
      console.error('Refund error:', error);
      throw error;
    }
  }

  await this.save();
};

// Post-save hook to update user's orders array
orderSchema.post('save', async function(doc) {
  try {
    await User.findByIdAndUpdate(doc.customer, { $addToSet: { orders: doc._id } });
  } catch (error) {
    console.error('Error updating user orders:', error);
  }
});

cron.schedule('0 0 1 * *', async () => {
  try {
    const result = await Order.deleteMany({
      payment_method: { $ne: 'COD' }, // Exclude COD
      payment_status: 'Pending' // Only target pending orders
    });

  } catch (error) {
    console.error('Error deleting orders:', error);
  }
});


const Order = model('Order', orderSchema);

export default Order;
