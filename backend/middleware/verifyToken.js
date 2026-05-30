import jwt from 'jsonwebtoken';
import pool from '../db.js';

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No token provided.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const currentUserResult = await pool.query(
      `SELECT id, email, role, is_active, deleted_at
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    if (currentUserResult.rows.length === 0 || currentUserResult.rows[0].deleted_at) {
      return res.status(401).json({
        success: false,
        message: 'Session is no longer valid.'
      });
    }

    const currentUser = currentUserResult.rows[0];

    if (!currentUser.is_active) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact support or an administrator.'
      });
    }

    req.user = {
      ...decoded,
      email: currentUser.email,
      role: currentUser.role,
      isActive: currentUser.is_active
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please login again.' 
      });
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    return res.status(403).json({ 
      success: false, 
      message: 'Failed to validate session.' 
    });
  }
};

export const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated.' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };
};
