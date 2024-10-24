import {jwtDecode} from 'jwt-decode';
import User from '../models/User.js';
import Address from '../models/Address.js';
import { decryptData, encryptData } from '../utils/Encryption.js';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

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

export const addAddress = async (req, res) => {
    try {
      const { encryptedData } = req.body;
      const decryptedData = decryptData(encryptedData);
      const parsedData = JSON.parse(decryptedData);
      const {
        name,
        address,
        city,
        state,
        pinCode,
        country,
        phoneNumber,
        locality,
        landmark,
        alternatePhoneNumber,
        addressType
      } = parsedData;
  
      const userId = req.user.id;

      if(!name || !address || !city || !state || !pinCode || !phoneNumber || !locality){
        return res.status(400).json({ message: 'Please provide all required fields' });
      }
      if (!isValidPhoneNumber(phoneNumber, 'IN')) {
        return res.status(400).json({ message: 'Invalid phone number' });
      }
  
      const user = await User.findById(userId).populate('addresses').exec();
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
       
      if(pinCode.length !== 6){
        return res.status(400).json({ message: 'Invalid pincode' });
      }
      const newAddress = new Address({
        name,
        address_line1: address,
        city,
        state,
        pinCode,
        country: country || 'India',
        phoneNumber,
        locality,
        landmark,
        alternatePhoneNumber,
        type: addressType
      });
  
      await newAddress.save();
      user.addresses.push(newAddress._id);
      await user.save();
      res.status(200).json({ message: 'Address added successfully'});
    } catch (error) {
      console.error('Error adding address:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

export const getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).populate('addresses');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const encryptedResponse = encryptData(JSON.stringify(user.addresses));
    res.status(200).json({ addresses: encryptedResponse });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const editAddress = async (req, res) => {
      const { encryptedData } = req.body;
      const decryptedData = JSON.parse(decryptData(encryptedData));

      if(!decryptedData.name || !decryptedData.address || !decryptedData.city || !decryptedData.state || !decryptedData.pinCode || !decryptedData.phoneNumber || !decryptedData.locality){
        return res.status(400).json({ message: 'Please provide all required fields' });
      }

      if (!isValidPhoneNumber(decryptedData.phoneNumber, 'IN')) {
        return res.status(400).json({ message: 'Invalid phone number' });
      }
      if (!isValidPhoneNumber(decryptedData.alternatePhoneNumber, 'IN')) {
        return res.status(400).json({ message: 'Invalid alternate phone number' });
      }
      if(pinCode.length !== 6){
        return res.status(400).json({ message: 'Invalid pincode' });
      }
      
      const addresses = await Address.findByIdAndUpdate(decryptedData.id, {
        name: decryptedData.name,
        address_line1: decryptedData.address,
        city: decryptedData.city,
        state: decryptedData.state,
        pinCode: decryptedData.pinCode,
        country: decryptedData.country,
        phoneNumber: decryptedData.phoneNumber,
        locality: decryptedData.locality,
        landmark: decryptedData.landmark,
        alternatePhoneNumber: decryptedData.alternatePhoneNumber,
        type: decryptedData.addressType,
        updated_at: new Date()
      })
      await addresses.save();
      res.status(200).json({ message: 'Address updated successfully' });
    } 


export const deleteAddress = async (req, res) => {
  const { encryptedData } = req.body;
  const decryptedData = JSON.parse(decryptData(encryptedData));
  await Address.findByIdAndDelete(decryptedData.id);
  res.status(200).json({ message: 'Address deleted successfully' });
}