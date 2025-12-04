import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import ScheduledPost from './src/models/ScheduledPost.js';
import ConnectedAccount from './src/models/ConnectedAccount.js';

dotenv.config();

const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('debug_results.txt', msg + '\n');
};

const debugScheduler = async () => {
    try {
        fs.writeFileSync('debug_results.txt', ''); // Clear file
        log('🔍 Starting Scheduler Debugger...');
        log('--------------------------------');

        // 1. Check Time
        const now = new Date();
        log(`🕒 Server Time (Local): ${now.toString()}`);
        log(`🕒 Server Time (ISO):   ${now.toISOString()}`);
        log('--------------------------------');

        // 2. Connect DB
        log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        log('✅ Connected');
        log('--------------------------------');

        // 3. Find Pending Posts
        log('🔎 Searching for pending posts...');
        const query = {
            status: 'pending',
            scheduledTime: { $lte: now }
        };
        log(`Query: ${JSON.stringify(query, null, 2)}`);

        const posts = await ScheduledPost.find(query);
        log(`📊 Found ${posts.length} posts ready to publish.`);

        if (posts.length > 0) {
            posts.forEach(p => {
                log(`   - Post ID: ${p._id}`);
                log(`     Scheduled: ${p.scheduledTime}`);
                log(`     Diff (min): ${Math.round((now - p.scheduledTime) / 60000)} mins late`);
            });
        } else {
            // Check for FUTURE posts to verify data exists at all
            const futurePosts = await ScheduledPost.find({ status: 'pending' });
            log(`🔮 Total pending posts in DB (future & past): ${futurePosts.length}`);
            if (futurePosts.length > 0) {
                log('   (Posts exist but are scheduled for the future)');
                futurePosts.forEach(p => {
                    log(`   - Post ID: ${p._id} | Scheduled: ${p.scheduledTime}`);
                });
            }
        }

        log('--------------------------------');
        process.exit(0);

    } catch (error) {
        log(`❌ Error: ${error.message}`);
        process.exit(1);
    }
};

debugScheduler();
