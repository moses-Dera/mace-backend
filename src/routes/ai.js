import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { protect } from '../middleware/auth.js';
import { generateCaption, generateHashtags, testGeminiAPI } from '../controllers/aiController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post('/generate-caption',
  [body('prompt').notEmpty().withMessage('Prompt is required')],
  validate,
  generateCaption
);

router.post('/generate-hashtags',
  [body('content').notEmpty().withMessage('Content is required')],
  validate,
  generateHashtags
);

// Test endpoint for Gemini API
router.get('/test-gemini', testGeminiAPI);

export default router;