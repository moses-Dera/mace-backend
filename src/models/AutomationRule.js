import mongoose from 'mongoose';

const automationRuleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['repost', 'auto_reply', 'hashtag_monitor', 'cross_post', 'scheduled_series'],
    required: true
  },
  triggers: {
    schedule: String, // cron format
    keywords: [String],
    platforms: [String]
  },
  actions: {
    platforms: [String],
    template: String,
    aiGenerate: Boolean
  },
  settings: mongoose.Schema.Types.Mixed,
  isActive: {
    type: Boolean,
    default: true
  },
  lastRun: Date,
  runCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model('AutomationRule', automationRuleSchema);