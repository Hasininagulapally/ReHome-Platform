import express from 'express';
import { body, validationResult } from 'express-validator';
import {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  getMyListings,
  updateItemStatus,
  getNearbyItems
} from '../controllers/itemController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadItemImages } from '../middleware/uploadMiddleware.js';
import { CATEGORIES, CONDITIONS } from '../models/Item.js';

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

// Item creation validation
const itemValidationRules = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Item title is required')
    .isLength({ max: 120 })
    .withMessage('Title cannot exceed 120 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Item description is required')
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(CATEGORIES)
    .withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
  body('condition')
    .notEmpty()
    .withMessage('Condition is required')
    .isIn(CONDITIONS)
    .withMessage(`Condition must be one of: ${CONDITIONS.join(', ')}`)
];

// 1. Nearby search (MUST be defined before /:id)
router.get('/nearby', getNearbyItems);

// 2. Current user's listings (MUST be defined before /:id)
router.get('/my/listings', protect, getMyListings);

// 3. Collection endpoints: GET /api/items & POST /api/items
router
  .route('/')
  .get(getItems)
  .post(
    protect,
    uploadItemImages.array('images', 5),
    validate(itemValidationRules),
    createItem
  );

// 4. Status update
router.patch('/status/:id', protect, updateItemStatus);
router.patch('/:id/status', protect, updateItemStatus);

// 5. Individual item endpoints: GET, PUT, DELETE /api/items/:id
router
  .route('/:id')
  .get(getItemById)
  .put(
    protect,
    uploadItemImages.array('images', 5),
    updateItem
  )
  .delete(protect, deleteItem);

export default router;
