import express from 'express';
import { body, validationResult } from 'express-validator';
import { register, login, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validation middleware helper
const validate = (validations) => {
  return async (req, res, next) => {
    for (const validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array().map((err) => err.msg)
    });
  };
};

// Register
router.post(
  '/register',
  validate([
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('email').trim().isEmail().withMessage('Please provide a valid email address').isLength({ max: 191 }).withMessage('Email cannot exceed 191 characters'),
    body('password').isLength({ min: 6, max: 128 }).withMessage('Password must be between 6 and 128 characters long')
  ]),
  register
);

// Login
router.post(
  '/login',
  validate([
    body('email').trim().isEmail().withMessage('Please provide a valid email address'),
    body('password').notEmpty().withMessage('Password is required')
  ]),
  login
);

// Get current user profile
router.get('/me', protect, getMe);

export default router;
