import User from '../models/User.js';
import Item from '../models/Item.js';

// @desc    Get safe public user profile
// @route   GET /api/users/:id
// @access  Public
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      'name city location createdAt'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Also count their active listings
    const activeListingsCount = await Item.countDocuments({
      owner: user._id,
      status: 'Available'
    });

    const totalListingsCount = await Item.countDocuments({
      owner: user._id
    });

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        city: user.location?.city || '',
        memberSince: user.createdAt,
        activeListingsCount,
        totalListingsCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update authenticated user's profile
// @route   PUT /api/users/me
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { name, phone, address, city, latitude, longitude } = req.body;

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (address !== undefined) user.address = address.trim();

    // Safely update location
    if (city !== undefined || latitude !== undefined || longitude !== undefined) {
      user.location = user.location || { type: 'Point', coordinates: [0, 0], city: '' };

      if (city !== undefined) user.location.city = city.trim();

      if (latitude !== undefined && longitude !== undefined) {
        const lat = Number(latitude);
        const lng = Number(longitude);

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return res.status(400).json({
            success: false,
            message: 'Coordinates out of bounds: latitude [-90, 90], longitude [-180, 180]'
          });
        }

        user.location.coordinates = [lng, lat];
      }
    }

    // Role cannot be changed through this endpoint
    // Save triggers schema validation
    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};
