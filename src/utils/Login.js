// import express from 'express';
// import User from '../models/User.js';
// import crypto from 'crypto';
// import { generateToken, generateRefreshToken } from '../utils/jwt.js';
// import dotenv from 'dotenv';

// dotenv.config();

// const router = express.Router();
// const otpStore = new Map();

// // Generate a 6-digit OTP
// const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// // Encrypt OTP
// const encryptOtp = (otp) => {
//   const key = crypto.scryptSync(process.env.OTP_SECRET, 'salt', 32);
//   const iv = crypto.randomBytes(16);
//   const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
//   let encrypted = cipher.update(otp, 'utf8', 'hex');
//   encrypted += cipher.final('hex');
//   return iv.toString('hex') + ':' + encrypted;
// };

// // Decrypt OTP
// const decryptOtp = (encryptedOtp) => {
//   const [ivHex, encrypted] = encryptedOtp.split(':');
//   const key = crypto.scryptSync(process.env.OTP_SECRET, 'salt', 32);
//   const iv = Buffer.from(ivHex, 'hex');
//   const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
//   let decrypted = decipher.update(encrypted, 'hex', 'utf8');
//   decrypted += decipher.final('utf8');
//   return decrypted;
// };

// // Endpoint to send OTP
// router.post('/send-otp', async (req, res) => {
//   const { phoneNumber, isSignUp, firstName, lastName } = req.body;
//   console.log(isSignUp)
//   if (!phoneNumber) return res.status(400).json({ message: 'No phone number provided' });

//   const sanitizedPhoneNumber = phoneNumber.replace(/\s+/g, '');
//   const otp = generateOtp();
//   const encryptedOtp = encryptOtp(otp);
//   const otpCreatedAt = new Date();

//   otpStore.set(sanitizedPhoneNumber, { encryptedOtp, otpCreatedAt });

//   if (isSignUp && (!firstName || !lastName)) {
//     return res.status(400).json({ message: 'First name and last name are required for sign up' });
//   }
//   if(isSignUp){
//     const user = await User.findOne({ mobile: sanitizedPhoneNumber });
//     if(user) return res.status(400).json({ message: 'User already exists' });
//   }

//   console.log(`OTP for ${sanitizedPhoneNumber} is ${otp}`);
//   res.send({ success: true, message: 'OTP sent successfully' });
// });

// // Endpoint to verify OTP
// router.post('/verify-otp', async (req, res) => {
//   const { phoneNumber, otp, isSignUp, firstName, lastName } = req.body;
//   console.log(req.body);
//   if (!phoneNumber || !otp) return res.status(400).json({ message: 'Phone number and OTP are required' });

//   const sanitizedPhoneNumber = phoneNumber.replace(/\s+/g, '');

//   try {
//     const storedData = otpStore.get(sanitizedPhoneNumber);
//     console.log('Stored Data:', storedData);
//     if (!storedData) return res.status(404).json({ message: 'OTP not found. Please request a new OTP.' });

//     const { encryptedOtp, otpCreatedAt } = storedData;
//     const decryptedOtp = decryptOtp(encryptedOtp);

//     if (new Date() - new Date(otpCreatedAt) > 5 * 60 * 1000) {
//       console.log('OTP expired');
//       return res.status(401).json({ message: 'OTP expired. Please request a new OTP.' });
//     }

//     console.log(`Decrypted OTP for ${sanitizedPhoneNumber} is ${decryptedOtp}`);
//     if (decryptedOtp !== otp) {
//       console.log('Invalid OTP');
//       return res.status(401).json({ message: 'Invalid OTP' });
//     }

//     otpStore.delete(sanitizedPhoneNumber);
//     console.log('Is SignUp:', isSignUp);
//     let user;
//     if (isSignUp) {
//       user = new User({ first_name: firstName, last_name: lastName, mobile: sanitizedPhoneNumber });
//       console.log('Creating new user');
//       await user.save();
//     } else {
//       user = await User.findOne({ mobile: sanitizedPhoneNumber });
//       if (!user) {
//         console.log('User not found');
//         return res.status(404).json({ message: 'User not found. Please sign up.' });
//       }
//     }

//     const token = generateToken(user);
//     const refreshToken = generateRefreshToken(user);

//     res.cookie('token', token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       maxAge: 3600000, // 1 hour
//     });

//     res.cookie('refreshToken', refreshToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       maxAge: 604800000, // 7 days
//     });

//     res.send({
//       success: true,
//       message: 'OTP verified successfully',
//       user: {
//         id: user._id,
//         firstName: user.first_name,
//         lastName: user.last_name,
//         mobile: user.mobile,
//       },
//     });
//   } catch (error) {
//     console.log('Error occurred during OTP verification:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });


// router.get('/check-auth', (req, res) => {
//   const token = req.cookies.token;
//   if (!token) {
//     return res.json({ isAuthenticated: false });
//   }

//   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) {
//       return res.json({ isAuthenticated: false });
//     } else {
//       return res.json({ isAuthenticated: true, user });
//     }
//   });
// });

// router.get('/logout', (req, res) => {
//   res.clearCookie('token');
//   res.clearCookie('refreshToken');
//   res.send({ success: true, message: 'Logged out successfully' });
// });

// export default router;