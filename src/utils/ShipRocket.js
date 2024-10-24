import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();


export function generateSKU(product) {
    const { category, _id } = product.product;
    const categoryCode = category ? category.substring(0, 3).toUpperCase() : "GEN";

    const idCode = _id ? _id.toString().slice(-4) : "0000";

    return `${categoryCode}-${idCode}`;
}

export const authenticateShiprocket = async () => {

    const credentials = {   
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
    };

    try {
        const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', credentials);
        const token = response.data.token;
        return token;
    } catch (error) {
        console.error("Error authenticating with Shiprocket:", error);
    }
}
export async function createShiprocketOrder(orderDetails) {
    const token = await authenticateShiprocket();
  
    const { order_id, order_date, shipping_address, payment_method, subTotal, items } = orderDetails;
    
    function formatDate(dateString) {
      const date = new Date(dateString);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
      const day = String(date.getDate()).padStart(2, '0');
      
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    
    const formattedDate = formatDate(order_date);
  
    const totalDimensions = items.reduce((acc, item) => {
      const itemLength = parseFloat(item.product.dimensions.length).toFixed(2); 
      const itemBreadth = parseFloat(item.product.dimensions.width).toFixed(2);
      const itemHeight = parseFloat(item.product.dimensions.height).toFixed(2);
      const itemWeight = parseFloat(item.product.weight).toFixed(2); 
      const quantity = item.quantity;
  
      acc.length = Math.max(acc.length, itemLength); 
      acc.breadth = Math.max(acc.breadth, itemBreadth);
      acc.height += itemHeight * quantity; 
      acc.weight += itemWeight * quantity;
      acc.volume += (itemLength * itemBreadth * itemHeight * quantity);
      
      return acc;
    }, { length: 0, breadth: 0, height: 0, weight: 0, volume: 0 });
  
    const orderItems = await Promise.all(items.map(async (product) => ({
      name: product.product.name,
      sku: await generateSKU(product), 
      units: product.quantity,
      selling_price: product.price,
    })));
  
    const orderData = JSON.stringify({
      "order_id": order_id,
      "order_date": formattedDate,
      "pickup_location": "Home",
      "billing_customer_name": shipping_address.name.split(' ')[0], 
      "billing_last_name": shipping_address.name.split(' ').slice(1).join(' ') || 'NA',
      "billing_address": shipping_address.address_line1,
      "billing_city": shipping_address.city,
      "billing_pincode": parseInt(shipping_address.pinCode, 10),
      "billing_state": shipping_address.state,
      "billing_country": shipping_address.country,
      "billing_phone": parseInt(shipping_address.phoneNumber, 10),
      "shipping_is_billing": true,
      "order_items": orderItems,
      "payment_method": payment_method === "COD" ? "COD" : "Prepaid", 
      "sub_total": subTotal,
      "length": totalDimensions.length,
      "breadth": totalDimensions.breadth,
      "height": totalDimensions.height,
      "weight": totalDimensions.weight
    });
  
    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}`
      },
      data: orderData
    };
    
    try {
      const response = await axios(config);
      return response.data; // Return the response data from the function
    } catch (error) {
      console.error('Error creating Shiprocket order:', error);
      throw error; // Optionally re-throw the error to handle it outside the function
    }
  }
