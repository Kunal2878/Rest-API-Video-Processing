const request = require('supertest');
const app = require('../app');
const db = require('../config/database');
const fs = require('fs');
const path = require('path');

describe('Video API E2E Tests', () => {
  let authToken;
  let uploadedVideoId;
  let secondVideoId;
  let shareToken;

  beforeAll(async () => {
    // Initialize database with required tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
      )
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        url TEXT,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create test user
    await db.query(`
      INSERT INTO users (username, password)
      VALUES ('testuser', 'hashedpassword')
    `);
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM videos');
    await db.query('DELETE FROM users');
    await db.end();

    // Clean up any test files created during testing
    const testOutputDir = path.join(__dirname, '../test-output');
    if (fs.existsSync(testOutputDir)) {
      fs.rmdirSync(testOutputDir, { recursive: true });
    }
  });

  it('should authenticate user and get token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testpassword'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    authToken = response.body.token;
  });

  it('should upload multiple videos', async () => {
    // Upload first video
    const response1 = await request(app)
      .post('/api/videos/upload')
      .attach('video', path.join(__dirname, '../test-files/sample1.mp4'))
      .set('Authorization', `Bearer ${authToken}`);

    expect(response1.status).toBe(200);
    expect(response1.body).toHaveProperty('id');
    uploadedVideoId = response1.body.id;

    // Upload second video
    const response2 = await request(app)
      .post('/api/videos/upload')
      .attach('video', path.join(__dirname, '../test-files/sample2.mp4'))
      .set('Authorization', `Bearer ${authToken}`);

    expect(response2.status).toBe(200);
    expect(response2.body).toHaveProperty('id');
    secondVideoId = response2.body.id;
  });

  it('should list user videos', async () => {
    const response = await request(app)
      .get('/api/videos')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
  });

  it('should trim the first video', async () => {
    const response = await request(app)
      .post('/api/videos/trim')
      .send({
        videoId: uploadedVideoId,
        startTime: 0,
        endTime: 5
      })
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('url');
  });

  it('should merge both videos', async () => {
    const response = await request(app)
      .post('/api/videos/merge')
      .send({
        videoIds: [uploadedVideoId, secondVideoId],
        title: 'Merged Video'
      })
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('url');
  });

  it('should share the merged video', async () => {
    const response = await request(app)
      .post('/api/videos/share')
      .send({ videoId: uploadedVideoId })
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    shareToken = response.body.token;
  });

  it('should access shared video with token', async () => {
    const response = await request(app)
      .get(`/api/videos/shared/${shareToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('url');
  });

  it('should handle errors appropriately', async () => {
    // Test invalid video ID
    const response = await request(app)
      .post('/api/videos/trim')
      .send({
        videoId: 99999,
        startTime: 0,
        endTime: 5
      })
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

  it('should enforce authentication', async () => {
    const response = await request(app)
      .get('/api/videos');

    expect(response.status).toBe(401);
  });
});
