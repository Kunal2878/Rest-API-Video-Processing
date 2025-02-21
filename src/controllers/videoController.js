// src/controllers/videoController.js
const path = require('path');
const fs = require('fs').promises;
const videoProcessor = require('../utils/videoProcessor');
const { generateShareToken } = require('../utils/tokens');
const db = require('../config/database');
const config = require('../config/config');

class VideoController {
  async upload(req, res, next) {
    try { 
      if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' });
      }

      const filePath = path.join(config.uploadDir, req.file.filename);
      const metadata = await videoProcessor.getMetadata(filePath);
      const validation = await videoProcessor.validateConstraints(metadata);

      if (!validation.valid) {
        await fs.unlink(filePath);
        return res.status(400).json({ 
          error: 'Video constraints not met',
          details: validation.errors
        });
      }

      const videoData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        duration: validation.duration,
        size: validation.size
      };

      const video = await db.addVideo(videoData);
      res.status(201).json(video);
    } catch (error) {
      next(error);
    }
  }

  async trim(req, res, next) {
    try {
      const { videoId, startTime, endTime } = req.body;

      if (!videoId || startTime === undefined || endTime === undefined) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      const video = await db.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      const inputPath = path.join(config.uploadDir, video.filename);
      const outputFileName = `trimmed_${Date.now()}_${video.filename}.mp4`;
      const outputPath = path.join(config.uploadDir, outputFileName);

      await videoProcessor.trimVideo(inputPath, startTime, endTime, outputPath);

      const metadata = await videoProcessor.getMetadata(outputPath);
      const validation = await videoProcessor.validateConstraints(metadata);

      if (!validation.valid) {
        await fs.unlink(outputPath);
        return res.status(400).json({ 
          error: 'Trimmed video constraints not met',
          details: validation.errors
        });
      }

      const videoData = {
        filename: outputFileName,
        originalName: `trimmed_${video.originalName}`,       
        duration: validation.duration,
        size: validation.size
      };

      const newVideo = await db.addVideo(videoData);
      res.json(newVideo);
    } catch (error) {
      next(error);
    }
  }
  async merge(req, res, next) {
    try {
      const { videoIds } = req.body;

      if (!Array.isArray(videoIds) || videoIds.length < 2) {
        return res.status(400).json({ error: 'At least two video IDs required' });
      }

      const videos = await Promise.all(
        videoIds.map(id => db.getVideo(id))
      );

      if (videos.some(v => !v)) {
        return res.status(404).json({ error: 'One or more videos not found' });
      }

      const inputPaths = videos.map(video => 
        path.join(config.uploadDir, video.filename)
      );

      const outputFileName = `merged-${Date.now()}.mp4`;
      const outputPath = path.join(config.uploadDir, outputFileName);

      await videoProcessor.mergeVideos(inputPaths, outputPath);

      const metadata = await videoProcessor.getMetadata(outputPath);
      const validation = await videoProcessor.validateConstraints(metadata);

      if (!validation.valid) {
        await fs.unlink(outputPath);
        return res.status(400).json({ 
          error: 'Merged video constraints not met',
          details: validation.errors
        });
      }

      const videoData = {
        filename: outputFileName,
        originalName: 'merged-video.mp4',
        duration: validation.duration,
        size: validation.size
      };

      const newVideo = await db.addVideo(videoData);
      res.json(newVideo);
    } catch (error) {
      next(error);
    }
  }

  async share(req, res, next) {
    try {
      const { videoId, expiryHours = 24 } = req.body;

      if (!videoId || !Number.isInteger(expiryHours) || expiryHours <= 0) {
        return res.status(400).json({ 
          error: 'Invalid parameters. videoId and positive expiryHours required' 
        });
      }

      const video = await db.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      const token = generateShareToken();
      console.log('Generated token for shared video:', token);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiryHours);

      const shareData = {
        videoId,
        token,
        expiresAt,
        filename: video.filename // Add filename to shareData
      };

      await db.addShareLink(shareData);

      res.json({
        shareUrl: `${config.baseUrl}/api/videos/shared/${token}`,
        expiresAt
      });
    } catch (error) {
      next(error);
    }
  }

  async getShared(req, res, next) {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      const shareLink = await db.getShareLink(token);
      if (!shareLink || new Date() > new Date(shareLink.expiresAt)) {
        return res.status(404).json({ 
          error: 'Share link not found or expired' 
        });
      }

      const filePath = path.join(config.uploadDir, shareLink.filename);
      
      if (!await this.fileExists(filePath)) {
        return res.status(404).json({ error: 'Video file not found' });
      }

      // Stream the video file
      const stat = await fs.stat(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;
        const file = require('fs').createReadStream(filePath, { start, end });
        
        const headers = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'inline'
        };
        
        res.writeHead(206, headers);
        file.pipe(res);
      } else {
        const headers = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'inline'
        };
        res.writeHead(200, headers);
        require('fs').createReadStream(filePath).pipe(res);
      }
    } catch (error) {
      next(error);
    }
  }
  async delete(req, res, next) {
    try {
      const { videoId } = req.params;

      const video = await db.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Check if file exists before attempting to stream
      if (!await this.fileExists(filePath)) {
        return res.status(404).json({ error: 'Video file not found' });
      }

      // Get file stats
      const stat = await fs.stat(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      // Handle range requests for video streaming
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        
        // Validate range
        if (start >= fileSize || end >= fileSize) {
          res.status(416).json({ error: 'Requested range not satisfiable' });
          return;
        }

        const chunkSize = end - start + 1;
        const file = require('fs').createReadStream(filePath, { start, end });
        
        const headers = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'inline',
          'Cache-Control': 'no-cache',
          'Cross-Origin-Resource-Policy': 'cross-origin'
        };
        
        res.writeHead(206, headers);
        file.pipe(res);
      } else {
        // Handle non-range requests
        const headers = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'inline',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache',
          'Cross-Origin-Resource-Policy': 'cross-origin'
        };
        
        res.writeHead(200, headers);
        const stream = require('fs').createReadStream(filePath);
        stream.on('error', (error) => {
          console.error('Stream error:', error);
          res.end();
        });
        stream.pipe(res);
      }

      const filePath = path.join(config.uploadDir, video.filename);
      await fs.unlink(filePath);
      await db.deleteVideo(videoId);

      res.json({ message: 'Video deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Helper method to check if file exists
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new VideoController();