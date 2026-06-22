import request from 'supertest';
import app from '../index';

describe('Auth API', () => {
  it('returns health check', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('rejects invalid candidate registration payload', async () => {
    const response = await request(app)
      .post('/api/auth/register/candidate')
      .send({ name: 'A', email: 'invalid', password: 'weak' });

    expect(response.status).toBe(400);
  });

  it('rejects login with missing credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notfound@example.com', password: 'WrongPass1!' });

    expect([400, 401]).toContain(response.status);
  });
});
