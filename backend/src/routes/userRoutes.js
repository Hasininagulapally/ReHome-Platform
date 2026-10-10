import express from 'express';
import { body, validationResult } from 'express-validator';
import { getUserProfile, updateProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

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

// Update current user profile
router.put(
  '/me',
  protect,
  validate([
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
  ]),
  updateProfile
);

// Get public profile of user by ID
router.get('/:id', getUserProfile);

export default router;
