import cron from 'node-cron';
import ScheduledPost from '../models/ScheduledPost.js';
import ConnectedAccount from '../models/ConnectedAccount.js';
import Log from '../models/Log.js';
import { publishPost } from './socialService.js';
import axios from 'axios';

// Check for posts to publish every minute
export const processScheduledPosts = async () => {
  try {
    console.log('Checking for scheduled posts...');

    // Find posts that are 'pending' and scheduled time has passed
    const now = new Date();
    const postsToPublish = await ScheduledPost.find({
      status: 'pending',
      scheduledTime: { $lte: now }
    });

    if (postsToPublish.length > 0) {
      console.log(`Found ${postsToPublish.length} posts to publish`);
    }

    for (const post of postsToPublish) {
      // Mark as processing
      post.status = 'processing';
      await post.save();

      const results = [];
      let allSuccess = true;

      // Publish to each platform
      for (const platform of post.platforms) {
        try {
          // Find the connected account for this platform
          const account = await ConnectedAccount.findOne({
            userId: post.userId,
            platform: platform,
            isActive: true
          });

          if (!account) {
            results.push({
              platform,
              success: false,
              error: 'Account not connected or inactive'
            });
            allSuccess = false;
            continue;
          }

          // Publish
          const result = await publishPost(platform, account, post);
          results.push({
            platform,
            ...result
          });

          if (!result.success) allSuccess = false;

        } catch (err) {
          results.push({
            platform,
            success: false,
            error: err.message
          });
          allSuccess = false;
        }
      }

      // Update post status
      post.status = allSuccess ? 'published' : 'failed';
      post.publishResults = results;
      await post.save();

      // Log activity
      await Log.create({
        userId: post.userId,
        type: 'post',
        action: 'published',
        status: allSuccess ? 'success' : 'partial_failure',
        details: { postId: post._id, results }
      });

      console.log(`Processed post ${post._id}: ${post.status}`);
    }

  } catch (error) {
    console.error('Post scheduler job error:', error);
  }
};

const postSchedulerJob = cron.schedule('* * * * *', processScheduledPosts);

// Refresh expired tokens daily
const tokenRefreshJob = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Refreshing expired tokens...');
    // Token refresh logic will be implemented here
  } catch (error) {
    console.error('Token refresh job error:', error);
  }
});

// Self-ping to keep server alive (runs every 14 minutes)
const selfPingJob = cron.schedule('*/14 * * * *', async () => {
  try {
    const port = process.env.PORT || 5000;
    // Use localhost for self-ping
    const url = `http://localhost:${port}/health`;
    console.log(`Pinging ${url} to keep server alive...`);
    const response = await axios.get(url);
    console.log(`Self-ping successful: ${response.status}`);
  } catch (error) {
    console.error('Self-ping failed:', error.message);
  }
});

export const startCronJobs = () => {
  postSchedulerJob.start();
  tokenRefreshJob.start();
  selfPingJob.start();
};

export const stopCronJobs = () => {
  postSchedulerJob.stop();
  tokenRefreshJob.stop();
  selfPingJob.stop();
};