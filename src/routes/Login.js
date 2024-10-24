import express from 'express';
import User from '../models/User.js';
import crypto from 'crypto';
import { generateToken, generateRefreshToken ,verifyRefreshToken } from '../utils/jwt.js';
import { decryptData , encryptData } from '../utils/Encryption.js';
import jwt from 'jsonwebtoken';
import {parsePhoneNumberFromString} from 'libphonenumber-js';
import twilio from 'twilio';

// Your Twilio Account SID and Auth Token
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Initialize the Twilio client
const client = twilio(accountSid, authToken);

// Example usage: Sending an SMS



const router = express.Router();
const otpStore = new Map();

// Generate a 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Encrypt OTP
const encryptOtp = (otp) => {
  const key = crypto.scryptSync(process.env.OTP_SECRET, 'salt', 32); // Derive a key from the secret
  const iv = crypto.randomBytes(16); // Generate a random initialization vector
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(otp, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted; // Return IV and encrypted OTP
};

// Decrypt OTP
const decryptOtp = (encryptedOtp) => {
  const [ivHex, encrypted] = encryptedOtp.split(':');
  const key = crypto.scryptSync(process.env.OTP_SECRET, 'salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

const generateRandomString = () => {
  return crypto.randomBytes(20).toString('hex');
}
const isValidPhoneNumber = (phoneNumber, countryCode) => {
  const number = parsePhoneNumberFromString(phoneNumber, countryCode);
  if (number && number.isValid() && number.nationalNumber.length === 10) {
    // Check if the number starts with 7, 8, or 9
    const validPrefix = /^[789]/.test(number.nationalNumber);
    return validPrefix;
  }else{
    return false
  }
  
};
// Endpoint to send OTP
router.post('/send-otp', async (req, res) => {
  const { phoneNumber, isSignUp, firstName, lastName } = req.body;
  if (!phoneNumber) return res.status(400).json({ message: 'No phone number provided' });

  const sanitizedPhoneNumber = phoneNumber.replace(/\s+/g, '');

  if(!isValidPhoneNumber(sanitizedPhoneNumber, 'IN')){
    return res.status(400).json({ message: 'Invalid phone number' });
  }
  if(!isSignUp){
    const user = await User.findOne({ mobile: sanitizedPhoneNumber });
    if(!user) return res.status(400).json({ message: 'User does not exists. Please sign up ' });
  }
  if(isSignUp){
    const user = await User.findOne({ mobile: sanitizedPhoneNumber });
    if(user) return res.status(400).json({ message: 'User already exists' });
  }
  const otp = generateOtp();
  const encryptedOtp = encryptOtp(otp);
  const otpCreatedAt = new Date();

  otpStore.set(sanitizedPhoneNumber, { encryptedOtp, otpCreatedAt });

  if (isSignUp && (!firstName || !lastName)) {
    return res.status(400).json({ message: 'First name and last name are required for sign up' });
  }

  // client.messages
  // .create({
  //   body: 'Hello from Twilio! Your OTP is ' + otp,
  //   from: '+1 424 772 3647', // Your Twilio number
  //   to: `+91${sanitizedPhoneNumber}` // Recipient's number
  // })
  // .then(message => {res.send({ success: true, message: 'OTP sent successfully' }); console.log(message.sid)})
  // .catch(error =>{res.send({ success: false, message: 'Error sending OTP' }); console.error('Error sending message:', error)});
  console.log(`Sending OTP to ${sanitizedPhoneNumber}: ${otp}`);
  return res.send({ success: true, message: 'OTP sent successfully' });
  
});

// Endpoint to verify OTP
router.post('/verify-otp', async (req, res) => {
  const { phoneNumber, otp, isSignUp, firstName, lastName } = req.body;
  if (!phoneNumber || !otp) return res.status(400).json({ message: 'Phone number and OTP are required' });

  const sanitizedPhoneNumber = phoneNumber.replace(/\s+/g, '');

  try {
    const storedData = otpStore.get(sanitizedPhoneNumber);
    if (!storedData) return res.status(404).json({ message: 'OTP not found. Please request a new OTP.' });

    const { encryptedOtp, otpCreatedAt } = storedData;
    const decryptedOtp = decryptOtp(encryptedOtp);

    if (new Date() - new Date(otpCreatedAt) > 5 * 60 * 1000) {
      otpStore.delete(sanitizedPhoneNumber); // Clean up expired OTP
      return res.status(401).json({ message: 'OTP expired. Please request a new OTP.' });
    }

    if (decryptedOtp !== otp) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    otpStore.delete(sanitizedPhoneNumber); // Clear OTP after successful verification

    let user;
    if (isSignUp) {
      user = await User.findOne({ mobile: sanitizedPhoneNumber });
      if (user) return res.status(400).json({ message: 'User already exists' });

      user = new User({ first_name: firstName, last_name: lastName, mobile: sanitizedPhoneNumber });
      await user.save();
    } else {
      user = await User.findOne({ mobile: sanitizedPhoneNumber });
      if (!user) return res.status(404).json({ message: 'User not found. Please sign up.' });
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 3600000, // 1 hour
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 604800000, // 7 days
    });

    const isAdmin = user.role === 'admin' ? "fkrarehytapadtieln" : generateRandomString(); // Determine if the user is an admin
    res.cookie('_gbsch_fg', isAdmin)

    res.send({
      success: true,
      message: 'OTP verified successfully',
      user: {
        id: user._id,
        firstName: user.first_name,
        lastName: user.last_name,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});


router.post("/getData", async(req, res) => {
  const { encryptedData } = req.body;

 
  try{
    const decryptedData = decryptData(encryptedData);

    const parsedData = JSON.parse(decryptedData);

    const encryptedResponse = encryptData(JSON.stringify(parsedData));
    res.send({ encryptedResponse });
  }catch(error){
    console.log(error)
  }
}
)

  router.post('/refresh-token', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
  
    if (!refreshToken) {
      res.clearCookie('token');
      res.clearCookie('refreshToken');
      res.clearCookie('isLoggedIn');
      res.clearCookie('_gbsch_fg');
      return res.status(403).send('Refresh token not found.');
    }
  
    try {
      const id = verifyRefreshToken(refreshToken);
      const user = await User.findById(id);
      if (!user) {
        throw new Error('User not found');
      }
  
      const token = generateToken(user);
  
  
      // Set new access token cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 3600000, // 1 hour
      });
  
      // Set isLoggedIn and isAdmin cookies
      res.cookie('isLoggedIn', true);
      const isAdmin = user.role === 'admin' ? "fkrarehytapadtieln" : generateRandomString();
      res.cookie('_gbsch_fg', isAdmin); // Store isAdmin status as a string
  
      return res.status(200).json({ success: true });
    } catch (error) {
      // Remove all relevant cookies on error
      res.clearCookie('token');
      res.clearCookie('refreshToken');
      res.clearCookie('isLoggedIn');
      res.clearCookie('_gbsch_fg');
      
      return res.status(403).send('Invalid or expired refresh token.');
    }
  });
  
// Example: Express route for logout
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.clearCookie('isLoggedIn');
  res.clearCookie('_gbsch_fg');
  
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});



export default router;
