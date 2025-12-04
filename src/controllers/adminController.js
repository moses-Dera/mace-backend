import User from '../models/User.js';
import ScheduledPost from '../models/ScheduledPost.js';
import ConnectedAccount from '../models/ConnectedAccount.js';
import Log from '../models/Log.js';
import AutomationRule from '../models/AutomationRule.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const totalPosts = await ScheduledPost.countDocuments();
    const pendingPosts = await ScheduledPost.countDocuments({ status: 'pending' });
    const connectedAccounts = await ConnectedAccount.countDocuments({ isActive: true });
    const activeAutomations = await AutomationRule.countDocuments({ isActive: true });

    // Recent activity
    const recentLogs = await Log.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name email');

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalPosts,
        pendingPosts,
        connectedAccounts,
        activeAutomations
      },
      recentActivity: recentLogs
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
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

export const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { userId } = req.params;

    if (!['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await Log.create({
      userId: req.user._id,
      type: 'system',
      action: 'user_status_updated',
      status: 'success',
      details: { targetUserId: userId, newStatus: status }
    });

    res.json({
      success: true,
      message: 'User status updated',
      user
    });
  } catch (error) {
    next(error);
  }
};

export const getAllLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type, status, userId } = req.query;
    
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (userId) filter.userId = userId;

    const logs = await Log.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Log.countDocuments(filter);

    res.json({
      success: true,
      logs,
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