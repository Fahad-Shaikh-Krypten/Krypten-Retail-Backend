import Cart from "../models/Cart.js";
import { jwtDecode } from "jwt-decode";
import { decryptData, encryptData } from "./Encryption.js";

// Fetch cart from database only
const getCartFromDB = async (user) => {
    const cart = await Cart.findOne({ user: user }).populate("items.product");
    return cart;
};

export const getCart = async (req, res) => {
    try {
        const cart = await getCartFromDB(req.user.id);
        const encryptedData = encryptData(JSON.stringify(cart));
        if (!cart) {
            const newCart = await Cart.create({
                user: req.user.id,
                items: [],
            });

            await newCart.save();
            const encryptedNewData = encryptData(JSON.stringify(newCart));
            res.status(201).json({ success: true, data: encryptedNewData });
        } else {
            res.status(200).json({ success: true, data: encryptedData });
        }
    } catch (error) {
        console.error('Error getting cart:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

export const addCartItem = async (req, res) => {
    const { encryptedData } = req.body;
    try {
        let cart = await getCartFromDB(req.user.id);

        const decryptedData = decryptData(encryptedData);
        const { product, quantity } = JSON.parse(decryptedData);

        if (!cart) {
            // If cart does not exist, create a new cart
            const newCart = await Cart.create({
                user: req.user.id,
                items: [{ product, quantity }],
            });
            return res.status(201).json({ success: true, data: newCart });
        } else {
            // If cart exists, update it
            const cartItemIndex = cart.items.findIndex(item => item.product == product);

            if (cartItemIndex > -1) {
                // If item already exists in the cart, update its quantity
                cart.items[cartItemIndex].quantity += quantity;
            } else {
                // Otherwise, add the new item to the cart
                cart.items.push({ product, quantity });
            }

            // Update the cart in the database
            const updatedCart = await Cart.findOneAndUpdate(
                { user: req.user.id }, 
                { items: cart.items },
                { new: true, runValidators: true }
            ).populate('items.product'); 

            if (!updatedCart) {
                return res.status(500).json({ success: false, message: 'Failed to update cart' });
            }

            // Encrypt the response data
            const encryptedResponse = encryptData(JSON.stringify(updatedCart));
            return res.status(200).json({ success: true, data: encryptedResponse });
        }
    } catch (error) {
        console.error('Error adding product to cart:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};


export const updateQuantity = async (req, res) => {
    const { encryptedData } = req.body;
    try {
        let cart = await getCartFromDB(req.user.id);

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const decryptedData = decryptData(encryptedData);
        const { product, quantity } = JSON.parse(decryptedData);
        const cartItem = cart.items.find(item => item.product._id == product);
        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Product not found in cart" });
        }

        // Update quantity in the database
        cartItem.quantity = quantity;

        cart = await Cart.findOneAndUpdate(
            { user: req.user.id, "items.product": product },
            { $set: { "items.$.quantity": quantity } },
            { new: true }
        ).populate("items.product");
        const encryptedResponse = encryptData(JSON.stringify(cart));

        return res.status(200).json({ success: true, data: encryptedResponse });
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

export const deleteCartItem = async (req, res) => {
    const { encryptedData } = req.body;

    try {
        const userId = req.user.id;
        let cart = await getCartFromDB(userId);


        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        // Decrypt and parse the data
        const decryptedData = decryptData(encryptedData);
        const { product } = JSON.parse(decryptedData);

        // Remove the product from the cart
        cart.items = cart.items.filter(item => item.product._id.toString() !== product);

        // Save the updated cart
        const updatedCart = await Cart.findOneAndUpdate(
            { user: userId }, // Correct field name based on your schema
            { items: cart.items },
            { new: true } // Return the updated document
        ).populate("items.product");

        if (!updatedCart) {
            return res.status(500).json({ success: false, message: "Failed to update cart" });
        }

        // Encrypt the response data
        const encryptedResponse = encryptData(JSON.stringify(updatedCart));
        return res.status(200).json({ success: true, data: encryptedResponse });
    } catch (error) {
        console.error('Error deleting product from cart:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};



// Merge local cart with user's server-side cart
export const mergeCart = async (req, res) => {
    try {
        const userId = req.user.id; // Extracted from the authentication middleware
        const { encryptedCart } = req.body;
    
        if (!encryptedCart) {
          return res.status(400).json({ success: false, message: 'No cart data provided' });
        }
    
        // Decrypt the cart data
        let localCart;
        try {
          const decryptedCart = decryptData(encryptedCart);
          localCart = JSON.parse(decryptedCart);
        } catch (error) {
          return res.status(400).json({ success: false, message: 'Failed to decrypt cart data' });
        }
    
        if (!localCart.items || !Array.isArray(localCart.items)) {
          return res.status(400).json({ success: false, message: 'Invalid cart data' });
        }
    
        // Fetch the user's current cart
        let userCart = await Cart.findOne({ user: userId });
    
        if (!userCart) {
          // Create a new cart if it doesn't exist
          userCart = new Cart({ user: userId, items: localCart.items });
        } else {
          // Merge local cart items with existing cart items
          localCart.items.forEach(localItem => {
            const existingItem = userCart.items.find(item => item.product.toString() === localItem.product);
            if (existingItem) {
              existingItem.quantity += localItem.quantity;
            } else {
              userCart.items.push(localItem);
            }
          });
        }
    
        // Save the updated cart
        await userCart.save();
    
        res.json({ success: true, message: 'Cart merged successfully'});
      } catch (error) {
        console.error('Error merging cart:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    };