const request = require('supertest');
const app = require('../server');

describe('Server endpoints', () => {
  test('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBeDefined();
  });

  test('POST /call-gemini returns demo response when prompt provided and demo-mode', async () => {
    process.env.GEMINI_API_KEY = 'demo-mode';
    const res = await request(app).post('/call-gemini').send({ prompt: 'Test prompt' });
    expect(res.statusCode).toBe(200);
    expect(res.body.html).toContain('Demo Response');
  });

  test('POST /generate-video-plan requires prompt and duration', async () => {
    const res = await request(app).post('/generate-video-plan').send({});
    expect(res.statusCode).toBe(400);
  });
});
