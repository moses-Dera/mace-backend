import express from 'express';
import { protect } from '../middleware/auth.js';
import Log from '../models/Log.js';

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    
    const filter = { userId: req.user._id };
    if (type) filter.type = type;

    const logs = await Log.find(filter)
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
});

export default router;