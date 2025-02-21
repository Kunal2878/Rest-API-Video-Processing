require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  videoConstraints: {
    maxSize: 25 * 1024 * 1024, // 25MB
    minDuration: 1, // 5 seconds
    maxDuration: 25, // 25 seconds
  },
  uploadDir: 'uploads',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',


};
