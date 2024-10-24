import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import Carousel from "../models/Carousel.js";
// Get the current file name and directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the root directory by navigating up two levels
const projectRoot = resolve(__dirname, '../../');

export const addCarousel = async (req, res) => {
    const {  caption } = req.body;
    const image = req.file || [];

    const carousel = new Carousel({
        url: image.path,
        caption
    });
    try {
        const savedCarousel = await carousel.save();
        res.status(201).json(savedCarousel);
    } catch (err) {
        res.status(500).json(err);
    }
}


export const getCarousels = async (req, res) => {
    const total = await Carousel.countDocuments(); // Count total carousel items
    const items = await Carousel.find()

    res.status(200).json({
      success: true,
      data: {
        items,
        total,
      },
    });
}


export const deleteCarousel = async (req, res) => {
    const { id } = req.params;

    try {
        // Find the carousel item to get the image path
        const carouselItem = await Carousel.findById(id);
        if (!carouselItem) {
            return res.status(404).json({ message: 'Carousel item not found' });
        }

        const imagePath = carouselItem.url; 

        const fullImagePath = path.join(projectRoot, imagePath); 


        fs.unlink(fullImagePath, (err) => {
            if (err) {
                console.error('Error deleting image file:', err);
            }
        });

        // Now delete the carousel item from the database
        const deletedCarousel = await Carousel.findByIdAndDelete(id);
        res.status(200).json({ message: 'Carousel item deleted successfully', deletedCarousel });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err });
    }
};
