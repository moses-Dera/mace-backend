import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { protect } from '../middleware/auth.js';
import {
  createScheduledPost,
  getScheduledPosts,
  deleteScheduledPost
} from '../controllers/postController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post('/schedule',
  [
    body('platforms').isArray().withMessage('Platforms must be an array'),
    body('caption').notEmpty().withMessage('Caption is required'),
    body('scheduledTime').isISO8601().withMessage('Valid scheduled time is required')
  ],
  validate,
  createScheduledPost
);

router.get('/scheduled', getScheduledPosts);
router.delete('/:id', deleteScheduledPost);

export default router;