import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import ConnectedAccount from './src/models/ConnectedAccount.js';
import ScheduledPost from './src/models/ScheduledPost.js';
import { processScheduledPosts } from './src/services/cronService.js';

dotenv.config();

const runTest = async () => {
    try {
        console.log('--- STARTING AUTOMATION TEST ---');

        // Connect to DB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Create Dummy User
        const user = await User.create({
            name: 'Test User',
            email: `test${Date.now()}@example.com`,
            password: 'password123'
        });
        console.log('Created User:', user._id);

        // 2. Create Dummy Connected Account (Instagram)
        await ConnectedAccount.create({
            userId: user._id,
            platform: 'instagram',
            platformUserId: '12345',
            accessToken: 'mock_token',
            username: 'test_user'
        });
        console.log('Created ConnectedAccount');

        // 3. Create Scheduled Post (Due in the past)
        const post = await ScheduledPost.create({
            userId: user._id,
            platforms: ['instagram'],
            caption: 'Test automation post',
            scheduledTime: new Date(Date.now() - 10000), // 10 seconds ago
            status: 'pending'
        });
        console.log('Created ScheduledPost:', post._id);

        // 4. Run the processing logic
        console.log('Running processScheduledPosts()...');
        await processScheduledPosts();

        // 5. Verify Result
        const updatedPost = await ScheduledPost.findById(post._id);
        console.log('Updated Post Status:', updatedPost.status);

        if (updatedPost.status === 'published') {
            console.log('✅ TEST PASSED: Post was published!');
            console.log('Publish Results:', updatedPost.publishResults);
        } else {
            console.error('❌ TEST FAILED: Post status is', updatedPost.status);
        }

        // Cleanup
        await User.findByIdAndDelete(user._id);
        await ConnectedAccount.deleteMany({ userId: user._id });
        await ScheduledPost.findByIdAndDelete(post._id);
        console.log('Cleanup complete');

    } catch (error) {
        console.error('Test Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

runTest();
