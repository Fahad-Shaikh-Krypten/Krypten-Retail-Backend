import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";
import { body, validationResult } from "express-validator";
import jwt from 'jsonwebtoken';
import { SECRET_KEY } from "../utils/jwt.js";


export const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        const uniqueFileName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueFileName);
    }
});

export const upload = multer({ storage: storage });


export const getId = (async (req, res, next) => {
    if (req) {
      const auth0Id = req.params.id;
      let {_id} = await User.findOne({auth_id: auth0Id }, "_id");
      req.dbId = _id; 
    }
    next();
  })

  export const validateSearch = [
    body('category').optional().isString().trim().escape(),
    body('brand').optional().isString().trim().escape(),
    body('search').optional().isString().trim().escape(),
    body('sort').optional().isIn(['asc', 'desc']),
    body('page').optional().isInt({ min: 1 }).toInt(),
];

export const getSynonyms = (term) => {
    const synonyms = {
        cellphone: ['cellphones', 'mobile', 'smartphone', 'phones', 'cell'],
        mobile: ['mobile', 'cellphone', 'smartphone', 'cellphones', 'phones'],
        smartphone: ['smartphone', 'cellphone', 'mobile', 'cellphones', 'phones'],
        laptop: ['laptop', 'notebook', 'ultrabook', 'laptops', 'notebooks'],
        notebook: ['notebook', 'laptop', 'ultrabook', 'notebooks', 'laptops'],
        shoes: ['shoes', 'footwear', 'boots', 'sandals'],
        shoe:['shoes', 'footwear', 'boots', 'sandals'],
        footwear: ['footwear', 'shoes', 'boots', 'sandals'],
        athletic: ['athletic', 'sportswear', 'activewear', 'sports clothing', 'fitness apparel'],
        sportswear: ['sportswear', 'athletic', 'activewear', 'sports clothing', 'fitness apparel'],
        apparel: ['apparel', 'clothing', 'garments', 'wear', 'attire', 'outfits'],
        electronics: ['electronics', 'gadgets', 'devices', 'tech', 'electronic items'],
        beauty: ['beauty', 'cosmetics', 'makeup', 'skincare', 'beauty products'],
        toys: ['toys', 'playthings', 'games', 'children\'s toys', 'kid\'s toys'],
        furniture: ['furniture', 'home furnishings', 'furnishings', 'furniture items'],
        kitchen: ['kitchen', 'kitchenware', 'cooking tools', 'kitchen items', 'cooking appliances']
        // Add more synonyms as needed
    };
    return synonyms[term.toLowerCase()] || [term];
};




// Function to get category mappings based on search terms
export const getCategoryMappings = (searchTerms) => {
    const categoryMappings = {
        mobiles: ['cellphone', 'cellphones', 'smartphone', 'smartphones', 'phones', 'mobile', 'cell', 'smart phones'],
        laptop: ['laptop', 'notebook', 'ultrabook', 'laptops', 'notebooks', 'notebook computers'],
        shoes: ['shoes','shoe', 'footwear', 'sneakers', 'sneaker', 'boots', 'sandals', 'footwear'],
        athletic: ['athletic', 'sportswear', 'activewear', 'sports clothing', 'athletic wear', 'fitness apparel'],
        apparel: ['apparel', 'clothing', 'garments', 'wear', 'attire', 'outfits'],
        electronics: ['electronics', 'gadgets', 'devices', 'tech', 'electronic items'],
        furniture: ['furniture', 'home furnishings', 'furnishings', 'furniture items'],
        kitchen: ['kitchen', 'kitchenware', 'cooking tools', 'kitchen items', 'cooking appliances'],
        beauty: ['beauty', 'cosmetics', 'makeup', 'skincare', 'beauty products'],
        toys: ['toys', 'playthings', 'games', 'children\'s toys', 'kid\'s toys']
    };

    const reverseMappings = Object.entries(categoryMappings).reduce((acc, [category, terms]) => {
        terms.forEach(term => {
            acc[term.toLowerCase()] = category;
        });
        return acc;
    }, {});

    return searchTerms.map(term => reverseMappings[term.toLowerCase()] || null).filter(category => category !== null);
};


// Middleware to authenticate token
export const authenticateToken = (req, res, next) => {
  const token = req.cookies.token; 

  if (!token) {
    return res.status(401).send({ success: false, message: 'No token provided' });
  }

  // Replace 'your-secret-key' with your actual secret key
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).send({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  });
};

export const authenticateAdmin = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).send({ success: false, message: 'Unauthorized' });
  }

  if (user.role !== 'admin') {
    return res.status(403).send({ success: false, message: 'Unauthorized' });
  }

  next();
};


  


