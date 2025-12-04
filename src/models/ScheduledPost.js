import mongoose from 'mongoose';

const scheduledPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platforms: [{
    type: String,
    enum: ['instagram', 'tiktok', 'linkedin', 'twitter', 'facebook']
  }],
  caption: {
    type: String,
    required: true
  },
  hashtags: [String],
  mediaUrls: [{
    url: String,
    type: { type: String, enum: ['image', 'video'] }
  }],
  scheduledTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'published', 'failed', 'cancelled'],
    default: 'pending'
  },
  publishResults: [{
    platform: String,
    success: Boolean,
    postId: String,
    postUrl: String,
    error: String,
    publishedAt: Date
  }],
  metadata: {
    location: String,
    tags: [String],
    firstComment: String
  }
}, {
  timestamps: true
});

// Index for efficient cron job queries
scheduledPostSchema.index({ scheduledTime: 1, status: 1 });
scheduledPostSchema.index({ userId: 1, status: 1 });

export default mongoose.model('ScheduledPost', scheduledPostSchema);