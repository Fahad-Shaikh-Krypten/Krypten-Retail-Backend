import express from "express";
import mongoose from "mongoose";
import path from "path";
import { dirname } from 'path';
import { fileURLToPath } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import userRouter from "./src/routes/User.js";
import ProductsRouter from "./src/routes/Products.js";
import ReviewRouter from "./src/routes/Review.js";
import CartRouter from "./src/routes/Cart.js";
import CategoryRouter from "./src/routes/Category.js";
import LoginRouter from "./src/routes/Login.js";
import OrderRouter from "./src/routes/Order.js";
import AddressRouter from "./src/routes/Address.js";
import CouponRouter from "./src/routes/Coupon.js";
import StatsRouter from "./src/routes/stats.js";
import CarouselRouter from "./src/routes/Carousel.js";
import bodyParser from "body-parser";
import { connectToDatabase } from "./src/utils/mongodb.js";
import cluster from "node:cluster";
import os from "node:os";
import VisitorCount from "./src/models/Visitors.js";
import { SitemapStream, streamToPromise } from 'sitemap'; // Destructure to get createSitemap
import Product from './src/models/Product.js'; // Assuming your products are in this model
import Category from './src/models/Category.js'; // Assuming your categories are in this model

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const lengthCpus = os.cpus().length;

if (cluster.isPrimary) {
    for (let i = 0; i < lengthCpus; i++) {
        cluster.fork();
    }
} else {
    const app = express();
    const port = process.env.PORT || 4000;

    dotenv.config();

    connectToDatabase();

    // app.use(express.static(path.join(__dirname, 'build')));
    // Middleware
    app.use(express.json());
    app.use(bodyParser.json());
    app.use(cookieParser());
    app.use('/uploads', express.static('uploads'));
    app.use(cors({
        origin: [process.env.FRONTEND],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type'],
        credentials: true
    }));

    // Routes
    app.use("/user", userRouter);
    app.use("/products", ProductsRouter);
    app.use("/review", ReviewRouter);
    app.use("/cart", CartRouter);
    app.use("/category", CategoryRouter);
    app.use("/login", LoginRouter);
    app.use("/order", OrderRouter);
    app.use("/shipping-address", AddressRouter);
    app.use("/coupon", CouponRouter);
    app.use("/stats", StatsRouter);
    app.use("/carousel", CarouselRouter);

    // Visitor tracking route
    app.post('/visitor', async (req, res) => {
        if (!req.cookies['visitor-tracked']) {
            await VisitorCount.findOneAndUpdate(
                {}, 
                { $inc: { count: 1 } },
                { upsert: true }
            );

            res.cookie('visitor-tracked', true, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Lax',
                maxAge: 24 * 60 * 60 * 1000,
            }); 
            return res.status(200).send('Visitor tracked and counted');
        }

        res.status(200).send('Visitor already tracked');
    });

    app.get('/robots.txt', (req, res) => {
        res.type('text/plain');
        res.sendFile(path.join(__dirname, 'robots.txt')); // Ensure this path is correct
    });
    // Route to generate dynamic sitemap
    app.get('/sitemap.xml', async (req, res) => {
        try {
            const baseUrl = process.env.FRONTEND; // Your frontend URL
            
            // Fetch dynamic content (products, categories, etc.)
            const products = await Product.find({}, 'name');

    
            // Create a new sitemap stream
            const sitemapStream = new SitemapStream({ hostname: baseUrl });
    
            // Add static URL for home
            sitemapStream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    
            // Map products to sitemap URLs
            products.forEach(product => {
                const productUrl = `/product/${encodeURIComponent(product.name.replace(/\s+/g, '-').toLowerCase())}`; // Replace spaces with hyphens and encode
                sitemapStream.write({ url: productUrl, changefreq: 'weekly', priority: 0.9 });
            });


    
            // End the sitemap stream
            sitemapStream.end();
    
            // Convert stream to XML
            const sitemap = await streamToPromise(sitemapStream).then(data => data.toString());
    
            // Set the content type and send the sitemap
            res.header('Content-Type', 'application/xml');
            res.send(sitemap);
        } catch (error) {
            console.error('Error generating sitemap:', error);
            res.status(500).send('Error generating sitemap');
        }
    });

    // Root route
    app.get("/", async (req, res) => {
        res.send('Welcome to our site!');
    });

    // app.get('*', (req, res) => {
    //     res.sendFile(path.join(__dirname + '/build/index.html'));
    //   });
    // Start server
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}
