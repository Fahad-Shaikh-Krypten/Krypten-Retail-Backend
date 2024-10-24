import mongoose from 'mongoose';
import User from './User.js';
const { Schema, model } = mongoose;

const addressSchema = new Schema({
  name: { type: String, required: true },
  address_line1: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pinCode: { type: String, required: true },
  country: { type: String, default: 'India' },
  phoneNumber: { type: String, required: true },
  locality: { type: String, required: true },
  landmark: { type: String },
  alternatePhoneNumber: { type: String },
  type: { type: String, default: 'Home', enum: ['Home', 'Work', 'Other'] },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const Address = model('Address', addressSchema);

// Webhook: Automatically remove the address from user's address list on address deletion
addressSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    // doc will contain the address that was deleted
    await User.updateMany(
      { addresses: doc._id },  // Find users with this address ID
      { $pull: { addresses: doc._id } }  // Remove the address ID from the user's addresses array
    );
  }
});

export default Address;
