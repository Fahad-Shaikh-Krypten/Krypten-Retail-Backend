import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();


export const SECRET_KEY = process.env.JWT_SECRET_KEY;
export const REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET_KEY;


export const generateToken = (user) => {
  if (!SECRET_KEY) {
    throw new Error('JWT_SECRET_KEY is not defined');
  }
  return jwt.sign({ id:user._id , role: user.role }, SECRET_KEY, { expiresIn: '1h' });
};

export const generateRefreshToken = (user) => {
  if (!REFRESH_SECRET_KEY) {
    throw new Error('JWT_REFRESH_SECRET_KEY is not defined');
  }
  return jwt.sign({ id: user._id }, REFRESH_SECRET_KEY, { expiresIn: '7d' });
};

export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET_KEY);
    return decoded.id; 
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};