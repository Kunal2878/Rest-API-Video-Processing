const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const generateShareToken = () => uuidv4();

const generateAuthToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: '24h'
  });
};

module.exports = {
  generateShareToken,
  generateAuthToken
};