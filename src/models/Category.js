import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Subcategory schema
const subcategorySchema = new Schema({
  name: { type: String },
  // Remove image from subcategory schema
}, {
  _id: false,  // Subcategories won't have their own _id
});

// Category schema
const categorySchema = new Schema({
  name: { type: String, required: true },
  Image: {
    url: { type: String, required: true },
    alt_text: { type: String, required: true },
  },
  type: { type: String, required: true ,enum: ["price", "simple"]},
  subcategories: { 
    type: [subcategorySchema],  
    default: []
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const Category = model('Category', categorySchema);

export default Category;
