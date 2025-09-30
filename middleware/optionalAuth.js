import jwt from 'jsonwebtoken';

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(" ")[1];
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decodedToken.id };
    }
    // Continue regardless of whether authentication was successful
    next();
  } catch (error) {
    // If token is invalid, continue without user info
    next();
  }
};

export default optionalAuth;