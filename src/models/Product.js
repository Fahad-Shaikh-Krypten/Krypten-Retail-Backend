import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const stockHistorySchema = new Schema({
  date: { type: Date, default: Date.now },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  purchase_price: { type: Number, required: true },
  reason: { type: String, enum: ["new", "restock","stock reduction"], required: true }, 
});

// Index on stockHistory.date for querying by date
stockHistorySchema.index({ date: 1 });

// Compound index on stockHistory.date and stockHistory.reason
stockHistorySchema.index({ date: 1, reason: 1 });

const specificationSchema = new Schema({
  key: { type: String, required: true },
  value: { type: String, required: true },
});

const productSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  display_price: { type: Number  },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  stockHistory: [stockHistorySchema], // Track stock changes over time
  category: { type: String, required: true },
  subcategory: { type: String, default: "" },
  brand: { type: String },
  images: {
    type: [
      {
        url: String,
        alt_text: String,
      },
    ],
    required: true,
  },
  specifications: [specificationSchema],
  keywords: [{ type: String }], // Added keywords field
  rating: { type: Number, default: 0 },
  
  // New weight and dimensions fields
  weight: { type: Number, required: true }, // Assuming weight is in kg or grams
  dimensions: {
    length: { type: Number, required: true }, // Length in cm or other unit
    width: { type: Number, required: true },  // Width in cm or other unit
    height: { type: Number, required: true }, // Height in cm or other unit
  },

  created_at: {
    type: Date,
    default: () => Date.now(),
    immutable: true,
  },
  updated_at: { type: Date, default: () => Date.now() },
});

// Text index for full-text search on product name and category
productSchema.index({ name: 'text', category: 'text' });

// Index on specifications for searching within specifications
productSchema.index({ 'specifications.key': 'text', 'specifications.value': 'text' });

// Index on price for range queries
productSchema.index({ price: 1 });

// Index on brand for exact match queries
productSchema.index({ brand: 1 });

// Index on subcategory for exact match queries
productSchema.index({ subcategory: 1 });

// Index on stock for efficient querying
productSchema.index({ stock: 1 });

// Compound index on category and brand for filtering
productSchema.index({ category: 1, brand: 1 });

// Index on keywords for efficient querying
productSchema.index({ keywords: 1 });

const Product = model('Product', productSchema);

export default Product;
