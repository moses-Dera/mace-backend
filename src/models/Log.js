import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['post', 'automation', 'auth', 'social_connect', 'ai', 'error', 'system'],
    required: true
  },
  action: String,
  status: {
    type: String,
    enum: ['success', 'failure', 'warning', 'info', 'partial_failure'],
    default: 'info'
  },
  platform: String,
  details: mongoose.Schema.Types.Mixed,
  errorMessage: String,
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Index for efficient querying
logSchema.index({ userId: 1, createdAt: -1 });
logSchema.index({ type: 1, createdAt: -1 });

// TTL index - auto-delete logs older than 90 days
logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.model('Log', logSchema);