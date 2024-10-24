import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  role: { type: String, default: 'user', enum: ['user', 'admin'] },
  addresses: [{ type: Schema.Types.ObjectId, ref: 'Address' ,default:[]}],
  orders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
  cart: { type: Schema.Types.ObjectId, ref: 'Cart' },
  created_at: { type: Date, default: Date.now }
});

const User = model('User', userSchema);

export default User;
