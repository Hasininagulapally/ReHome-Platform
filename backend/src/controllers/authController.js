
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

// POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, address, location, city } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists'
      });
    }

    const coordinates = location?.coordinates || [];
    const userLocation = {
      type: 'Point',
      coordinates: [
        Number(location?.longitude ?? coordinates[0] ?? 0),
        Number(location?.latitude ?? coordinates[1] ?? 0)
      ],
      city: location?.city || city?.trim() || ''
    };

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: phone?.trim() || '',
      address: address?.trim() || '',
      location: userLocation,
      role: 'user'
    });

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user
    });
  } catch (error) {
    if (error.code === 11000 || error.code === 'ER_DUP_ENTRY' || error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists'
      });
    }
    next(error);
  }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        location: user.location,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};
