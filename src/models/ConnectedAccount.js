import mongoose from 'mongoose';

const connectedAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    enum: ['instagram', 'tiktok', 'linkedin', 'twitter', 'facebook'],
    required: true
  },
  platformUserId: {
    type: String,
    required: true
  },
  username: String,
  displayName: String,
  profilePicture: String,
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: String,
  tokenExpiresAt: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: [String],
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Compound index for user + platform
connectedAccountSchema.index({ userId: 1, platform: 1 });

export default mongoose.model('ConnectedAccount', connectedAccountSchema);