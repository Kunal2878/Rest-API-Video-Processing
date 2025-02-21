// Step 7: Run the test using one of these commands:
// Option 1: npm test src/test/video_unit.test.js
// Option 2: jest src/test/video_unit.test.js
// Step 8: Check the test results in the console output
// Step 1: Make sure you have Node.js and npm installed on your system
// Step 2: Install the required dependencies by running: npm install
// Step 3: Make sure you have SQLite installed
// Step 4: Update the database configuration in ../config/database.js to use SQLite
// Step 5: Create a test video file at test-files/sample.mp4
// Step 6: Run the tests using one of the commands below
// Option 1: npm test src/test/video_unit.test.js
const request = require('supertest');
const app = require('../app');
const db = require('../config/database');
describe('Video API', () => {
  beforeAll(async () => {
    await db.query('CREATE TABLE IF NOT EXISTS videos (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, url TEXT, user_id INTEGER)');
  });

  afterAll(async () => {
    await db.query('DELETE FROM videos');
    await db.end();
  });

  it('should upload a video successfully', async () => {
    const response = await request(app)
      .post('/api/videos/upload')
      .attach('video', '../test-files/sample1.mp4')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
  });

  it('should trim a video successfully', async () => {
    const response = await request(app)
      .post('/api/videos/trim')
      .send({ videoId: 1, startTime: 0, endTime: 10 })
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
  });

  it('should merge videos successfully', async () => {
    const response = await request(app)
      .post('/api/videos/merge')
      .send({ videoIds: [1, 2] })
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
  });

  it('should share a video successfully', async () => {
    const response = await request(app)
      .post('/api/videos/share')
      .send({ videoId: 1 })
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('should get a shared video by token', async () => {
    const shareResponse = await request(app)
      .post('/api/videos/share')
      .send({ videoId: 1 })
      .set('Authorization', 'Bearer test-token');

    const response = await request(app)
      .get(`/api/videos/shared/${shareResponse.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
  });
});
