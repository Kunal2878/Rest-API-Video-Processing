const express = require('express');
const router = express.Router();
const multer = require('multer');
const videoController = require('../controllers/videoController');
const authMiddleware = require('../middleware/auth');
  const upload = multer({ 
    dest: 'uploads/',    // Specifies the directory where uploaded files will be stored
    limits: { fileSize: 25 * 1024 * 1024 } // Sets maximum file size to 25MB (25 * 1024 * 1024 bytes)
  });

router.use(authMiddleware);

router.post('/upload', upload.single('video'), videoController.upload);
router.post('/trim', videoController.trim);
router.post('/merge', videoController.merge);
router.post('/share', videoController.share);
router.get('/shared/:token', videoController.getShared.bind(videoController));
module.exports = router;