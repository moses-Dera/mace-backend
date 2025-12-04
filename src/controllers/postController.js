import ScheduledPost from '../models/ScheduledPost.js';
import ConnectedAccount from '../models/ConnectedAccount.js';
import Log from '../models/Log.js';

export const createScheduledPost = async (req, res, next) => {
  try {
    const { platforms, caption, hashtags, mediaUrls, scheduledTime, metadata } = req.body;

    // Validate user has connected accounts for selected platforms
    const connectedAccounts = await ConnectedAccount.find({
      userId: req.user._id,
      platform: { $in: platforms },
      isActive: true
    });

    if (connectedAccounts.length !== platforms.length) {
      return res.status(400).json({
        success: false,
        message: 'Not all selected platforms are connected'
      });
    }

    const post = await ScheduledPost.create({
      userId: req.user._id,
      platforms,
      caption,
      hashtags,
      mediaUrls,
      scheduledTime: new Date(scheduledTime),
      metadata
    });

    await Log.create({
      userId: req.user._id,
      type: 'post',
      action: 'scheduled',
      status: 'success',
      details: { postId: post._id, platforms }
    });

    res.status(201).json({
      success: true,
      message: 'Post scheduled successfully',
      post
    });
  } catch (error) {
    next(error);
  }
};

export const getScheduledPosts = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const filter = { userId: req.user._id };
    if (status) filter.status = status;

    const posts = await ScheduledPost.find(filter)
      .sort({ scheduledTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ScheduledPost.countDocuments(filter);

    res.json({
      success: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteScheduledPost = async (req, res, next) => {
  try {
    const post = await ScheduledPost.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete published post'
      });
    }

    await ScheduledPost.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};