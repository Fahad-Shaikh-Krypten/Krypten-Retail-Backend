import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order.js';
import User from '../models/User.js';
import NodeCache from 'node-cache';
import { decryptData , encryptData} from './Encryption.js';
import Address from '../models/Address.js';
import { createShiprocketOrder , authenticateShiprocket} from './ShipRocket.js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();


const cache = new NodeCache({ stdTTL: 3600 });
const razorpay = new Razorpay({
    key_id:process.env.RAZORPAY_KEY_ID,
    key_secret:process.env.RAZORPAY_SECRET_KEY,
});

const generateOrderNumber = async () => {
  let orderNumber = 'ORD-0000001'; // Default starting number with 7 digits

  try {
    // Find the last order by sorting in descending order based on order_number
    const lastOrder = await Order.findOne({ order_number: { $exists: true } })
                                 .sort({ order_number: -1 })
                                 .exec();
    
    if (lastOrder && lastOrder.order_number) {
      // Extract the numerical part, increase it, and then format the new order number
      const lastNumber = parseInt(lastOrder.order_number.replace('ORD-', ''), 10);
      orderNumber = `ORD-${(lastNumber + 1).toString().padStart(7, '0')}`; 
    }
  } catch (error) {
    console.error('Error generating order number:', error);
  }

  return orderNumber;
};

export const createOrder = async (req, res) => {
    const { encryptedData } = req.body;
    const { customer, order_date, amount, items , shipping_address, payment_method  } = JSON.parse(decryptData(encryptedData));
    const userAddress = await Address.findOne({ _id: shipping_address });
    const shippingCharge = 50;
    const order_number = await generateOrderNumber();
    var razorpayOrder;
    if(payment_method === 'Razorpay'){
        razorpayOrder= await razorpay.orders.create({
            amount: amount * 100, // Convert to paise
            currency: 'INR',
            receipt: crypto.randomBytes(16).toString('hex'),
            payment_capture: 1, // Auto capture payment
        });
      }
        // Save order details in MongoDB
        const orderData = {
          order_number,
          customer,
          order_date,
          total_amount: amount,
          items,
          shipping_charges: shippingCharge,
          shipping_address,
          payment_method,
          payment_id: payment_method === 'Razorpay' ? razorpayOrder.id : null,
        };
    
        if (payment_method === 'COD') {
         const shiprocketData = {
            order_id: order_number,
            order_date: new Date(),
            subTotal: amount,
            items: items,
            shipping_address: userAddress,
            payment_method: payment_method
          }
          const shiprocket = await createShiprocketOrder(shiprocketData);
          orderData.status = [
            {
              status: 'Ordered',
              date: new Date()
            }
          ];
          orderData.shiprocketOrderId = shiprocket.order_id;
        }

        const order = new Order(orderData);
        await order.save();
        var encryptedResponse;
        if(payment_method === 'Razorpay'){
        encryptedResponse = encryptData(JSON.stringify({
          orderId: order._id,
          razorpayOrderId: razorpayOrder?.id || null
        }));
      }

    
        res.status(201).json({ success: true, data:encryptedResponse  });
};


export const getAllOrders = async (req, res) => {
    const encryptData = req.body.encryptedData;
    const { perPage , page } = JSON.parse(decryptData(encryptData));
  const orders = await Order.find({
    $or: [
      { payment_method: { $ne: 'Razorpay' } }, // Include orders where payment_method is not Razorpay
      { payment_method: 'Razorpay', payment_status: { $ne: 'Pending' } } // Include Razorpay orders only if payment_status is not pending
    ]
  }).populate('customer').populate('shipping_address').populate('items.product').skip(perPage * (page - 1)).limit(perPage);
  const total = await Order.countDocuments({
    $or: [
      { payment_method: { $ne: 'Razorpay' } }, // Include orders where payment_method is not Razorpay
      { payment_method: 'Razorpay', payment_status: { $ne: 'Pending' } } // Include Razorpay orders only if payment_status is not pending
    ]
  });

    res.status(200).json({ success: true, data: { orders, total } });
}   

export const updatePaymentStatus = async (req, res) => {
        const { encryptedData } = req.body;
        const { orderId, paymentId } = JSON.parse(decryptData(encryptedData));
        try {
          const order = await Order.findById(orderId).populate('items.product').populate('shipping_address');
      
          if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
          }
      
          // Update order status based on payment method
          if (paymentId) {
            // Update for Razorpay
            order.payment_id = paymentId;
            order.payment_status = 'Paid'; 
            order.status.push({
              status: 'Ordered',
              date: new Date() 
            });
            console.log("order",order);
            const shiprocketData = {
              order_id: order.order_number,
              order_date: new Date(),
              subTotal: order.total_amount,
              items: order.items,
              shipping_address: order.shipping_address,
              payment_method: order.payment_method
            }
            const shiprocket = await createShiprocketOrder(shiprocketData);
            console.log("shiprocket",shiprocket);
            order.shiprocketOrderId = shiprocket.order_id;
          } else {
            // Update for Cash on Delivery
            order.payment_status = 'Pending'; // Set status to 'Pending' or another relevant status
          }
      
          // Save the updated order
          await order.save();
      
          res.status(200).json({ success: true });
        } catch (error) {
          console.error('Error updating order:', error);
          res.status(500).json({ success: false, message: 'Server error' });
        }
      };


export const verifyPayment = async (req, res) => {
    const { encryptedData } = req.body;
    const { order_id, payment_id, signature } = JSON.parse(decryptData(encryptedData)); 
    const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
        .update(order_id + "|" + payment_id)
        .digest('hex');

    if (generatedSignature === signature) {
        try {
            const order = await Order.findOne({ payment_id: order_id });
            if (order) {
                order.payment_status = 'Paid';
                await order.save();
                res.status(200).json({ success: true, message: 'Payment verified successfully' });
            } else {
                res.status(404).json({ success: false, message: 'Order not found' });
            }
        } catch (error) {
            console.error('Error verifying payment:', error);
            res.status(500).json({ success: false, error: 'Failed to verify payment' });
        }
    } else {
        res.status(400).json({ success: false, message: 'Invalid signature' });
    }
};


export const myOrders = async (req, res) => {
    const userId = req.user.id;
    const orders = await Order.find({
      customer: userId,
      $or: [
        { payment_method: { $ne: 'Razorpay' } }, // Include all orders except Razorpay
        { payment_method: 'Razorpay', 
          payment_status: { $ne: 'Pending' } } // Include Razorpay orders only if payment_status is not Pending
      ]
    }).populate('items.product').populate('shipping_address').sort({ order_date: -1 });
    const encryptedResponse = encryptData(JSON.stringify(orders));
    res.status(200).json({ success: true, data: encryptedResponse });
}

export const cancelOrder = async (req, res) => {
  const { orderId } = req.body;
  const id = JSON.parse(decryptData(orderId));
  
  try {
      const order = await Order.findById(id);
      if (!order) {
          return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // Check if the order can be cancelled
      if (order.status[order.status.length - 1].status === 'Delivered') {
          return res.status(400).json({ success: false, message: 'Cannot cancel a delivered order' });
      }

      // Call the method to handle cancellation and refund
      await order.cancelOrder();

      res.status(200).json({ success: true, message: 'Order cancelled and refund initiated' });
  } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({ success: false, message: 'Server error' });
  }
};
export const bestSellers = async (req, res) => { 
  try {
    const bestSellers = await cache.get('bestSellers');
    if (bestSellers) {
      return res.status(200).json({ success: true, data: bestSellers });
    }
    const bestSellingProducts = await Order.aggregate([
      // Filter orders to include only those with a 'Delivered' status
      {
        $match: { "status.status": "Delivered" }
      },
      // Unwind the items array to process each product separately
      { $unwind: '$items' },
      // Group by product ID and calculate the total quantity sold
      {
        $group: {
          _id: '$items.product', // Group by product ID
          totalSold: { $sum: '$items.quantity' }, // Sum the quantities sold
        },
      },
      // Lookup the product details from the products collection
      {
        $lookup: {
          from: 'products', // The name of your products collection
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      // Unwind the product details array
      {
        $unwind: '$productDetails',
      },
      // Calculate the score based on totalSold / price
      {
        $addFields: {
          score: { $divide: ['$totalSold', '$productDetails.price'] },
        },
      },
      // Sort by the score in descending order to get the best sellers
      { $sort: { score: -1 } },
      // Project the necessary fields in the output
      {
        $project: {
          _id: 0, // Exclude the _id field
          productId: '$_id',
          totalSold: 1,
          productDetails: 1, // Include all fields from productDetails
          score: 1 // Include the calculated score
        }
      },
      // Limit the results to the top 10 best-selling products
      { $limit: 10 }
    ]);

    // Send the response
    const encryptedResponse = encryptData(JSON.stringify(bestSellingProducts));
    await cache.set('bestSellers', encryptedResponse);
    res.json({ success: true, data: encryptedResponse });
  } catch (error) {
    console.error('Error fetching best sellers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch best sellers' });
  }
};


export const updateManualOrderStatus = async (req, res) => {
  const { encryptedData } = req.body;
  
  // Decrypt the incoming data and parse it
  const { id, status } = JSON.parse(decryptData(encryptedData));
  
  // Find the order by ID
  const order = await Order.findById(id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Check if the status is already present in the order's status array
  if (!order.status.some(s => s.status.toLowerCase() === status.toLowerCase())) {
    // Push the new status and the current date if not already present
    order.status.push({ status, date: Date.now() });
    
    // Save the updated order status
    await order.save();
    return res.status(200).json({ success: true, message: 'Order status updated successfully' });
  } else {
    // If the status is already present, respond accordingly
    return res.status(200).json({ success: false, message: 'Status is already present.This Step is already completed' });
  }
};

export const updateOrderStatus = async (req, res) => {
  // Get the token from the X-Api-Key header
  const token = req.headers['x-api-key'];
  console.log('Received token:', token);

  // Define valid statuses for comparison
  const validStatuses = [
    'Pending',
    'Ordered',
    'Pickup Scheduled',
    'Picked Up',
    'In Transit',
    'Out for Delivery',
    'Delivered',
    'Returned',
    'Cancelled',
    'Refunded'
  ];

  // Normalize valid statuses for case-insensitive comparison
  const normalizedValidStatuses = validStatuses.map(status => status.toLowerCase());

  // Compare token without Bearer prefix
  if (token === process.env.SHIPROCKET_WEBHOOK_TOKEN) {
    // Handle the webhook payload
    console.log('Webhook received:', req.body);

    // Retrieve the order based on the provided order ID
    const order = await Order.findOne({ shiprocketOrderId: req.body.order_id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Normalize the incoming status to lower case
    const currentStatus = req.body.current_status?.toLowerCase();

    // Check if the incoming status is valid and not already in the order status
    if (normalizedValidStatuses.includes(currentStatus) && 
        !order.status.some(s => s.status.toLowerCase() === currentStatus)) {
      // Find the corresponding valid status (case-sensitive) to push to the order
      const validStatusToPush = validStatuses.find(status => status.toLowerCase() === currentStatus);
      
      order.status.push({
        status: validStatusToPush, // Use the correctly formatted status
        date: new Date(),
      });
    }

    // Save the updated order status
    await order.save();
    return res.status(200).json({ success: true, message: 'Order status updated successfully' });
  } else {
    // Unauthorized access
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
};


export const getShippingCharge = async (req, res) => {
  const { encryptedData } = req.body;
} 

export const downloadInvoice = async (req, res) => {
  const { encryptedData } = req.body;
  const token = await authenticateShiprocket();
  const decryptedData = decryptData(encryptedData);
  const parsedData = JSON.parse(decryptedData);
  var data = JSON.stringify({
    "ids": [
      parsedData
    ]
  });

var config = {
  method: 'post',
maxBodyLength: Infinity,
  url: 'https://apiv2.shiprocket.in/v1/external/orders/print/invoice',
  headers: { 
    'Content-Type': 'application/json', 
    'Authorization': `Bearer ${token}`
  },
  data : data
};

const response = await axios(config);
const encryptedResponse = encryptData(JSON.stringify(response.data));
res.json({ success: true, data: encryptedResponse });
}

export const trackOrder = async (req, res) => {
  const { encryptedData } = req.body;
  const token = await authenticateShiprocket();
  console.log(token);
  const decryptedData = decryptData(encryptedData);
  const parsedData = JSON.parse(decryptedData);

  var config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${parsedData}`,
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${token}`
    }
  };
  const response = await axios(config);
  console.log(response.data); 
  const encryptedResponse = encryptData(JSON.stringify(response.data));
  res.json({ success: true, data: encryptedResponse });
 
}