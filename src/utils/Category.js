import Category from "../models/Category.js";
import { encryptData, decryptData } from "../utils/Encryption.js";
import User from "../models/User.js"; 
import NodeCache from "node-cache";
import fs from "fs";
import path , { resolve } from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = resolve(__dirname, '../../');

const cache = new NodeCache({ stdTTL: 3600 });
// Get price categories
export const getPriceCategory = async (req, res) => {
    try {
        const priceCategory = await cache.get("priceCategory");
        if (priceCategory) {
            return res.status(200).json({ success: true, data: priceCategory });
        }
        const products = await Category.find({ type: "price" }).select("-created_at -updated_at -type");
        const encryptedResponse = encryptData(JSON.stringify(products));
        await cache.set("priceCategory", encryptedResponse);
        res.status(200).json({ success: true, data: encryptedResponse });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get simple categories
export const getSimpleCategory = async (req, res) => {
    try {
        // const simpleCategory = await cache.get("simpleCategory");
        // if (simpleCategory) {
        //     return res.status(200).json({ success: true, data: simpleCategory });
        // }
        const products = await Category.find({ type: "simple" }).select("-created_at -updated_at ");
        const encryptedResponse = encryptData(JSON.stringify(products));
        await cache.set("simpleCategory", encryptedResponse);
        res.status(200).json({ success: true, data: encryptedResponse });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get paginated categories
export const getCategories = async (req, res) => {
    try {
        const {encryptedData} = req.body;
        const decryptedData = decryptData(encryptedData);
        const parsedData = JSON.parse(decryptedData);
        const { page = 1, perPage = 10 } = parsedData;
        const categories = await Category.find()
            .skip((page - 1) * perPage)
            .limit(perPage);
        const total = await Category.countDocuments();
        const encryptedResponse = encryptData(JSON.stringify({categories,total}));
        res.status(200).json({ success: true, data: encryptedResponse });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get a single category by ID
export const getCategory = async (req, res) => {
    try {
        const {encryptedData} = req.body;
        const decryptedData = decryptData(encryptedData);
        const parsedData = JSON.parse(decryptedData);
        const { id } = parsedData;
        const category = await Category.findById(id);
        const encryptedResponse = encryptData(JSON.stringify(category));
        res.status(200).json({ success: true, data: encryptedResponse });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get all categories
export const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        const encryptedResponse = encryptData(JSON.stringify(categories));
        res.status(200).json({ success: true, data: encryptedResponse });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Create a new category
export const createCategory = async (req, res) => {
    try {
        const { name, type,subcategories } = req.body;
        const { path } = req.file; // Ensure multer or similar middleware is used to handle file uploads
        const parsedSubcategories = typeof subcategories === "string" ? JSON.parse(subcategories) : subcategories;
        const category = await Category.create({
            name,
            type,
            Image: {
                url: path,
                alt_text: name
            },
            subcategories: Array.isArray(parsedSubcategories) ? parsedSubcategories : [],
        });

        res.status(201).json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update a category
export const updateCategory = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, type, subcategories } = req.body;
      const path = req.file?.path;
  
      // Build the update object dynamically
      const updateData = {};
  
      if (name) updateData.name = name;
      if (type) updateData.type = type;
  
      if (path) {
        updateData.Image = {
          url: path,
          alt_text: name || '', // Use the name if provided for alt_text
        };
      }
  
      if (subcategories) {
        const parsedSubcategories = typeof subcategories === 'string' ? JSON.parse(subcategories) : subcategories;
        updateData.subcategories = Array.isArray(parsedSubcategories) ? parsedSubcategories : [];
      }
  
      // Find the category by ID and update it with the new data
      const category = await Category.findByIdAndUpdate(id, updateData, { new: true });
  
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
  
      res.status(200).json({ success: true, data: category });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
  
// Delete a category
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the category before deleting to access the image
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Delete the associated image from the uploads folder
        const imagePath = path.join(projectRoot, category.Image.url); // Adjust the path if necessary
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.error(`Failed to delete image: ${imagePath}`, err);
            }
        });

        // Now delete the category
        await Category.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};