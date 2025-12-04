import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import ScheduledPost from './src/models/ScheduledPost.js';
import User from './src/models/User.js';

dotenv.config();

const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('debug_posts_results.txt', msg + '\n');
};

const checkPosts = async () => {
    try {
        fs.writeFileSync('debug_posts_results.txt', '');
        log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        log('✅ Connected');

        // Simulate the controller query
        const filter = {}; // No status filter (default 'all')
        const limit = 10;
        const page = 1;

        log('\n🔍 Simulating Controller Query:');
        log(`   Filter: ${JSON.stringify(filter)}`);
        log(`   Sort: { scheduledTime: -1 }`);
        log(`   Limit: ${limit}`);
        log(`   Page: ${page}`);

        const posts = await ScheduledPost.find(filter)
            .sort({ scheduledTime: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        log(`\n📊 Query returned ${posts.length} posts.`);

        if (posts.length > 0) {
            posts.forEach((p, i) => {
                log(`\n[${i + 1}] ID: ${p._id}`);
                log(`    Status: ${p.status}`);
                log(`    Scheduled: ${p.scheduledTime}`);
                log(`    Caption: ${p.caption}`);
            });
        }

        process.exit(0);
    } catch (error) {
        log(`❌ Error: ${error.message}`);
        process.exit(1);
    }
};

checkPosts();
