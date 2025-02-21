// src/config/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(
      path.join(__dirname, '../../database.sqlite'),
      (err) => {
        if (err) {
          console.error('Database connection error:', err);
        } else {
          console.log('Connected to SQLite database');
          this.init();
        }
      }
    );
  }

  init() {
    this.db.serialize(() => {
      // Videos table
      this.db.run(`CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        originalName TEXT NOT NULL,
        duration INTEGER NOT NULL,
        size INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Shared links table
      this.db.run(`CREATE TABLE IF NOT EXISTS shared_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos (id)
      )`);
    });
  }

  // Video operations
  async addVideo(videoData) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(
        `INSERT INTO videos (filename, originalName, duration, size) 
         VALUES (?, ?, ?, ?)`
      );
      
      stmt.run(
        videoData.filename,
        videoData.originalName,
        videoData.duration,
        videoData.size,
        function(err) {
          if (err) reject(err);
          resolve({ id: this.lastID, ...videoData });
        }
      );
    });
  }

  async getVideo(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM videos WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });
  }

  async getAllVideos() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM videos ORDER BY created_at DESC', (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  }

  async deleteVideo(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM videos WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        resolve({ affected: this.changes });
      });
    });
  }

  // Share link operations
  async addShareLink(linkData) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(
        `INSERT INTO shared_links (video_id, token, expires_at) 
         VALUES (?, ?, ?)`
      );
      
      stmt.run(
        linkData.videoId,
        linkData.token,
        linkData.expiresAt.toISOString(),
        function(err) {
          if (err) reject(err);
          resolve({ id: this.lastID, ...linkData });
        }
      );
    });
  }

  async getShareLink(token) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT sl.*, v.filename, v.originalName 
         FROM shared_links sl
         JOIN videos v ON sl.video_id = v.id
         WHERE sl.token = ? AND sl.expires_at > datetime('now')`,
        [token],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });
  }

  async deleteExpiredShareLinks() {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM shared_links WHERE expires_at <= datetime("now")',
        function(err) {
          if (err) reject(err);
          resolve({ affected: this.changes });
        }
      );
    });
  }

  // Clean up resources
  async close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }
}

module.exports = new Database();