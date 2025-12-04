import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import { generateToken } from './src/middleware/auth.js';

dotenv.config();

const debugTwitterAuth = async () => {
    try {
        console.log('--- DEBUGGING TWITTER AUTH ---');

        // 1. Connect to DB to get a user
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Create a temp user if needed, or find one
        let user = await User.findOne({ email: 'test@example.com' });
        if (!user) {
            user = await User.create({
                name: 'Debug User',
                email: 'test@example.com',
                password: 'password123'
            });
        }

        // 2. Generate Token
        const token = generateToken(user._id);
        console.log('Generated Token for user:', user._id);

        // 3. Make Request to Backend
        try {
            const response = await axios.get('http://localhost:5000/api/social/auth/twitter', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('✅ Success! Auth URL:', response.data.url);
        } catch (err) {
            console.error('❌ Request Failed:', err.message);
            if (err.response) {
                console.error('Status:', err.response.status);
                console.error('Data:', err.response.data);
            }
        }

        await mongoose.disconnect();

    } catch (error) {
        console.error('Script Error:', error);
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
    }
};

debugTwitterAuth();
