
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authorization denied. No Bearer token provided in headers'
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists'
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.message === 'JWT_SECRET is not configured') {
      return next(error);
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authorization token'
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: role '${req.user?.role || 'guest'}' does not have access to this resource`
      });
    }

    next();
  };
};
