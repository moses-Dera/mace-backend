import express from 'express';
import { protect } from '../middleware/auth.js';
import ConnectedAccount from '../models/ConnectedAccount.js';

import { handleFacebookDeletion, initiateTwitterAuth, handleTwitterCallback } from '../controllers/socialController.js';

const router = express.Router();

// Debug endpoint
router.get('/test', protect, (req, res) => {
  res.json({ 
    message: 'Social routes working',
    user: req.user._id,
    env: {
      twitterClientId: process.env.TWITTER_CLIENT_ID ? 'Present' : 'Missing',
      twitterClientSecret: process.env.TWITTER_CLIENT_SECRET ? 'Present' : 'Missing',
      frontendUrl: process.env.FRONTEND_URL
    }
  });
});

// Twitter OAuth
router.get('/auth/twitter', protect, initiateTwitterAuth);
router.post('/callback/twitter', handleTwitterCallback);

// Facebook Data Deletion Callback
// Note: This route must be publicly accessible (no 'protect' middleware)
router.post('/callback/facebook/deletion', handleFacebookDeletion);

router.get('/accounts', protect, async (req, res, next) => {
  try {
    const accounts = await ConnectedAccount.find({
      userId: req.user._id,
      isActive: true
    }).select('-accessToken -refreshToken');

    res.json({
      success: true,
      accounts
    });
  } catch (error) {
    next(error);
  }
});

export default router;