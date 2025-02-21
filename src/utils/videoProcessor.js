// src/utils/videoProcessor.js
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const config = require('../config/config');

class VideoProcessor {
  getMetadata(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(err);
        resolve(metadata);
      });
    });
  }

  async validateConstraints(metadata) {
    const { size } = metadata.format;
    const duration = Math.floor(metadata.format.duration);

    const valid = 
      size <= config.videoConstraints.maxSize &&
      duration >= config.videoConstraints.minDuration &&
      duration <= config.videoConstraints.maxDuration;

    return {
      valid,
      size,
      duration,
      errors: valid ? [] : [
        size > config.videoConstraints.maxSize ? 'File size exceeds maximum limit' : null,
        duration < config.videoConstraints.minDuration ? 'Video duration is too short' : null,
        duration > config.videoConstraints.maxDuration ? 'Video duration is too long' : null
      ].filter(Boolean)
    };
  }

  trimVideo(inputPath, startTime, endTime, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(startTime)  // Sets the starting point to trim from
        .setDuration(endTime - startTime)  // Calculates and sets how long the trimmed video should be
        .output(outputPath)  // Specifies where to save the trimmed video
        .on('end', resolve)  // Resolves the promise when trimming is complete
        .on('error for rejection ', reject)  // Rejects the promise if an error occurs
        .run();  // Starts the trimming process
    });
  }
  mergeVideos(inputPaths, outputPath) {
    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      
      inputPaths.forEach(inputPath => {
        command.input(inputPath);
      });

      command
        .on('end', resolve)
        .on('error', reject)
        .mergeToFile(outputPath, config.uploadDir);
    });
  }
}

module.exports = new VideoProcessor();
