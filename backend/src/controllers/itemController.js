import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Item, { CATEGORIES, CONDITIONS, STATUSES } from '../models/Item.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to construct image URL/path for uploaded files
const processUploadedImages = (req) => {
  const images = [];

  // Files uploaded via Multer
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    req.files.forEach((file) => {
      images.push(`/uploads/${file.filename}`);
    });
  }

  // Support image URLs passed as array or comma-separated string in body
  if (req.body.imageUrls) {
    if (Array.isArray(req.body.imageUrls)) {
      images.push(...req.body.imageUrls.filter((url) => typeof url === 'string' && url.trim()));
    } else if (typeof req.body.imageUrls === 'string') {
      const urls = req.body.imageUrls.split(',').map((u) => u.trim()).filter(Boolean);
      images.push(...urls);
    }
  }

  return images;
};

// Helper to parse location payload
const parseLocationData = (body) => {
  let address = body.address ? body.address.trim() : '';
  let city = body.city ? body.city.trim() : '';

  if (!address && !city && typeof body.location === 'string') {
    const parts = body.location.split(',');
    address = parts[0]?.trim() || body.location.trim();
    city = parts[1]?.trim() || (parts[0]?.trim() || '');
  }

  let latitude = body.latitude !== undefined && body.latitude !== '' ? Number(body.latitude) : undefined;
  let longitude = body.longitude !== undefined && body.longitude !== '' ? Number(body.longitude) : undefined;

  // Check nested location object if present
  if (body.location && typeof body.location === 'object') {
    if (latitude === undefined && body.location.latitude !== undefined) {
      latitude = Number(body.location.latitude);
    }
    if (longitude === undefined && body.location.longitude !== undefined) {
      longitude = Number(body.location.longitude);
    }
  }

  const location = {
    address,
    city,
    type: 'Point'
  };

  if (latitude !== undefined && longitude !== undefined && !isNaN(latitude) && !isNaN(longitude)) {
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error('Coordinates out of range: latitude [-90, 90], longitude [-180, 180]');
    }
    // GeoJSON [longitude, latitude]
    location.coordinates = [longitude, latitude];
  }

  return location;
};

// @desc    Create a new item listing
// @route   POST /api/items
// @access  Private
export const createItem = async (req, res, next) => {
  try {
    const { title, description, category, condition, status } = req.body;

    // Parse boolean and numeric values
    const isFree =
      req.body.isFree === true ||
      req.body.isFree === 'true' ||
      req.body.isFree === 1 ||
      req.body.isFree === '1';

    let price = req.body.price !== undefined ? Number(req.body.price) : 0;
    if (isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a valid non-negative number'
      });
    }

    if (isFree) {
      price = 0;
    }

    let location;
    try {
      location = parseLocationData(req.body);
    } catch (locErr) {
      return res.status(400).json({
        success: false,
        message: locErr.message
      });
    }

    const images = processUploadedImages(req);

    const item = await Item.create({
      title: title?.trim(),
      description: description?.trim(),
      category,
      price,
      isFree,
      condition,
      images,
      owner: req.user._id,
      location,
      status: status || 'Available'
    });

    const populatedItem = await Item.findById(item._id).populate(
      'owner',
      'name email phone location createdAt'
    );

    res.status(201).json({
      success: true,
      message: 'Item listing created successfully',
      item: populatedItem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all items with pagination, search, and filters
// @route   GET /api/items
// @access  Public
export const getItems = async (req, res, next) => {
  try {
    const parsedPage = req.query.page !== undefined ? parseInt(req.query.page, 10) : 1;
    const page = isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);

    const parsedLimit = req.query.limit !== undefined ? parseInt(req.query.limit, 10) : 12;
    const limit = isNaN(parsedLimit) ? 12 : Math.min(100, Math.max(1, parsedLimit));
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by status (default: Available, or specific status if requested)
    if (req.query.status) {
      query.status = req.query.status;
    } else {
      query.status = 'Available';
    }

    // Keyword search across title, description, and category
    if (req.query.q) {
      const searchRegex = new RegExp(req.query.q.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex }
      ];
    }

    // Category filter
    if (req.query.category && req.query.category.toLowerCase() !== 'all') {
      const matchedCategory = CATEGORIES.find(
        (c) => c.toLowerCase() === req.query.category.toLowerCase()
      );
      if (matchedCategory) {
        query.category = matchedCategory;
      }
    }

    // Condition filter
    if (req.query.condition && req.query.condition.toLowerCase() !== 'all') {
      const matchedCondition = CONDITIONS.find(
        (c) => c.toLowerCase() === req.query.condition.toLowerCase()
      );
      if (matchedCondition) {
        query.condition = matchedCondition;
      }
    }

    // Free items filter
    if (req.query.freeOnly === 'true' || req.query.isFree === 'true') {
      query.isFree = true;
    }

    // Price range filters
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      query.price = {};
      if (req.query.minPrice !== undefined) {
        const min = Number(req.query.minPrice);
        if (!isNaN(min)) query.price.$gte = min;
      }
      if (req.query.maxPrice !== undefined) {
        const max = Number(req.query.maxPrice);
        if (!isNaN(max)) query.price.$lte = max;
      }
    }

    // City filter
    if (req.query.city) {
      query['location.city'] = new RegExp(req.query.city.trim(), 'i');
    }

    // Sorting
    let sort = { createdAt: -1 };
    if (req.query.sortBy === 'price_asc') {
      sort = { price: 1, createdAt: -1 };
    } else if (req.query.sortBy === 'price_desc') {
      sort = { price: -1, createdAt: -1 };
    } else if (req.query.sortBy === 'oldest') {
      sort = { createdAt: 1 };
    }

    const [total, items] = await Promise.all([
      Item.countDocuments(query),
      Item.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('owner', 'name email phone location createdAt')
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      page,
      limit,
      totalPages,
      items
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single item details
// @route   GET /api/items/:id
// @access  Public
export const getItemById = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id).populate(
      'owner',
      'name email phone address location createdAt'
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.status(200).json({
      success: true,
      item
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an item listing
// @route   PUT /api/items/:id
// @access  Private (Owner or Admin only)
export const updateItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Authorization check
    const isOwner = item.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to edit this listing'
      });
    }

    const { title, description, category, condition, status } = req.body;

    if (title) item.title = title.trim();
    if (description) item.description = description.trim();
    if (category) item.category = category;
    if (condition) item.condition = condition;
    if (status) item.status = status;

    if (req.body.isFree !== undefined) {
      const isFree =
        req.body.isFree === true ||
        req.body.isFree === 'true' ||
        req.body.isFree === 1 ||
        req.body.isFree === '1';
      item.isFree = isFree;
      if (isFree) item.price = 0;
    }

    if (req.body.price !== undefined && !item.isFree) {
      const price = Number(req.body.price);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a valid non-negative number'
        });
      }
      item.price = price;
    }

    // Process location updates if provided
    if (
      req.body.address !== undefined ||
      req.body.city !== undefined ||
      req.body.latitude !== undefined ||
      req.body.longitude !== undefined ||
      req.body.location
    ) {
      try {
        const updatedLocation = parseLocationData(req.body);
        item.location = { ...item.location.toObject(), ...updatedLocation };
      } catch (locErr) {
        return res.status(400).json({
          success: false,
          message: locErr.message
        });
      }
    }

    // Process new images
    const newImages = processUploadedImages(req);
    if (newImages.length > 0) {
      // Append or replace based on replaceImages flag
      if (req.body.replaceImages === 'true' || req.body.replaceImages === true) {
        item.images = newImages;
      } else {
        item.images = [...item.images, ...newImages];
      }
    }

    const updatedItem = await item.save();
    const populated = await Item.findById(updatedItem._id).populate(
      'owner',
      'name email phone location createdAt'
    );

    res.status(200).json({
      success: true,
      message: 'Item updated successfully',
      item: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an item listing
// @route   DELETE /api/items/:id
// @access  Private (Owner or Admin only)
export const deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    const isOwner = item.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete this listing'
      });
    }

    // Clean up uploaded image files from disk
    if (item.images && Array.isArray(item.images)) {
      for (const imgUrl of item.images) {
        if (typeof imgUrl === 'string' && imgUrl.startsWith('/uploads/')) {
          const filename = path.basename(imgUrl);
          const filePath = path.resolve(__dirname, '../../uploads', filename);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch {
              // ignore file deletion errors
            }
          }
        }
      }
    }

    await item.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get listings created by the authenticated user
// @route   GET /api/items/my/listings
// @access  Private
export const getMyListings = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { owner: req.user._id };

    if (req.query.status) {
      query.status = req.query.status;
    }

    const [total, items] = await Promise.all([
      Item.countDocuments(query),
      Item.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      page,
      limit,
      totalPages,
      items
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update item status (Available, Reserved, Given Away)
// @route   PATCH /api/items/:id/status
// @access  Private (Owner or Admin only)
export const updateItemStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${STATUSES.join(', ')}`
      });
    }

    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    const isOwner = item.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to update this item status'
      });
    }

    item.status = status;
    await item.save();

    res.status(200).json({
      success: true,
      message: `Item status updated to '${status}'`,
      item
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Discover items nearby using geospatial coordinates or city
// @route   GET /api/items/nearby
// @access  Public
export const getNearbyItems = async (req, res, next) => {
  try {
    const rawLat = req.query.latitude !== undefined && req.query.latitude !== '' ? req.query.latitude : req.query.lat;
    const rawLng = req.query.longitude !== undefined && req.query.longitude !== '' ? req.query.longitude : req.query.lng;
    const { city, category } = req.query;
    const radiusKm = Math.min(100, Math.max(0.5, parseFloat(req.query.radiusKm) || 10));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const hasLat = rawLat !== undefined && rawLat !== '';
    const hasLng = rawLng !== undefined && rawLng !== '';

    // If coordinates are provided, perform geospatial search with distance
    if (hasLat && hasLng) {
      const lat = parseFloat(rawLat);
      const lng = parseFloat(rawLng);

      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates: latitude must be [-90, 90] and longitude [-180, 180]'
        });
      }

      const maxDistanceMeters = radiusKm * 1000;

      // Base match filters
      const matchCriteria = {
        status: req.query.status || 'Available'
      };

      if (category && category.toLowerCase() !== 'all') {
        const matchedCategory = CATEGORIES.find(
          (c) => c.toLowerCase() === category.toLowerCase()
        );
        if (matchedCategory) {
          matchCriteria.category = matchedCategory;
        }
      }

      if (req.query.freeOnly === 'true' || req.query.isFree === 'true') {
        matchCriteria.isFree = true;
      }

      // MongoDB geospatial aggregation pipeline
      const pipeline = [
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [lng, lat] // GeoJSON [longitude, latitude]
            },
            distanceField: 'distanceMeters',
            maxDistance: maxDistanceMeters,
            spherical: true,
            query: matchCriteria
          }
        },
        {
          $addFields: {
            distanceKm: {
              $round: [{ $divide: ['$distanceMeters', 1000] }, 1]
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'owner',
            foreignField: '_id',
            as: 'owner'
          }
        },
        {
          $unwind: '$owner'
        },
        {
          $project: {
            'owner.password': 0,
            'owner.__v': 0
          }
        },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [{ $skip: skip }, { $limit: limit }]
          }
        }
      ];

      const [result] = await Item.aggregate(pipeline);
      const total = result.metadata[0]?.total || 0;
      const items = result.data || [];
      const totalPages = Math.ceil(total / limit) || 1;

      return res.status(200).json({
        success: true,
        mode: 'coordinates',
        center: { latitude: lat, longitude: lng },
        radiusKm,
        count: items.length,
        total,
        page,
        limit,
        totalPages,
        items
      });
    }

    // If coordinates are missing but city is provided, filter by city (no fake distance)
    if (city && city.trim()) {
      const cityQuery = {
        'location.city': new RegExp(city.trim(), 'i'),
        status: req.query.status || 'Available'
      };

      if (category && category.toLowerCase() !== 'all') {
        const matchedCategory = CATEGORIES.find(
          (c) => c.toLowerCase() === category.toLowerCase()
        );
        if (matchedCategory) {
          cityQuery.category = matchedCategory;
        }
      }

      if (req.query.freeOnly === 'true' || req.query.isFree === 'true') {
        cityQuery.isFree = true;
      }

      const [total, items] = await Promise.all([
        Item.countDocuments(cityQuery),
        Item.find(cityQuery)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('owner', 'name email phone location createdAt')
      ]);

      const totalPages = Math.ceil(total / limit) || 1;

      return res.status(200).json({
        success: true,
        mode: 'city',
        city: city.trim(),
        count: items.length,
        total,
        page,
        limit,
        totalPages,
        items
      });
    }

    // If neither coordinates nor city were supplied
    return res.status(400).json({
      success: false,
      message:
        'Please provide coordinates (latitude, longitude) or a city name to search for nearby items'
    });
  } catch (error) {
    next(error);
  }
};
