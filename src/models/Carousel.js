
import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const carouselSlideSchema = new Schema({
    url: {
        type: String,
        required: true,
    },
    caption: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default model('CarouselSlide', carouselSlideSchema)