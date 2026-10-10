import jwt from 'jsonwebtoken';

const generateToken = (userId, role = 'user') => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be configured');
  }

  return jwt.sign({ id: userId, role }, secret, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

export default generateToken;
