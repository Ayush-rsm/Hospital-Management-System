import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';

const authUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };

    const user = await userModel.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    next();
  } catch (error) {
    console.error('authUser:', error);
    res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

export default authUser;



