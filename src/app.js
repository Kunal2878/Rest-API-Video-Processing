// src/app.js
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const config = require('./config/config');
const { errorHandler } = require('./middleware/errorHandler');
const videoRoutes = require('./routes/videoRoutes');

const app = express();

// Load Swagger document
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger/api.yaml'));

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/videos', videoRoutes);

// Error handling
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
  
  const token = jwt.sign(
    { userId: '1234' }, // payload with your data
    process.env.JWT_SECRET,
    { expiresIn: '36h' } // optional expiration
  );
  console.log("Token",token)
});

module.exports = app;