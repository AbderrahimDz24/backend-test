import request from 'supertest';
import app from './app';

describe('Register', () => {
  it('should return 201', async () => {
    const username = `user_${Date.now()}`;
    const res = await request(app)
      .post('/register')
      .send({
        username,
        email: `${username}@email.com`,
        type: 'admin',
        password: 'User@1',
      });
    expect(res.statusCode).toEqual(201);
  });

  describe('when the username already exists', () => {
    it('should return 409', async () => {
      const username = `user_${Date.now()}`;
      const res1 = await request(app)
        .post('/register')
        .send({
          username,
          email: `${username}_1@email.com`,
          type: 'admin',
          password: 'User@1',
        });
      const res = await request(app)
        .post('/register')
        .send({
          username,
          email: `${username}_2@email.com`,
          type: 'admin',
          password: 'User@1',
        });
      expect(res1.status).toEqual(201);
      expect(res.status).toEqual(409);
    });
  });

  describe('when the email already exists', () => {
    it('should return 409', async () => {
      const username = `user_${Date.now()}`;
      const res1 = await request(app)
        .post('/register')
        .send({
          username: username + '_1',
          email: `${username}@email.com`,
          type: 'admin',
          password: 'User@1',
        });
      const res = await request(app)
        .post('/register')
        .send({
          username: username + '_2',
          email: `${username}@email.com`,
          type: 'admin',
          password: 'User@1',
        });
      expect(res1.status).toEqual(201);
      expect(res.status).toEqual(409);
    });
  });

  describe('when the body is not valid', () => {
    it('should return 400', async () => {
      const res = await request(app).post('/register').send({});
      expect(res.status).toEqual(400);
      expect(res.body.error).toBe('"username" is required');
    });
  });
});

describe('Login', () => {
  describe('when the credentials are correct', () => {
    it('should return 200', async () => {
      const username = `user_${Date.now()}`;
      const password = 'User@1';
      const res1 = await request(app)
        .post('/register')
        .send({
          username,
          email: `${username}@email.com`,
          type: 'admin',
          password,
        });
      expect(res1.status).toEqual(201);

      const res = await request(app).post('/login').send({
        username,
        password,
      });
      expect(res.status).toBe(200);
    });
  });
  describe('when the username is incorrect', () => {
    it('should return 401', async () => {
      const username = `user_${Date.now()}`;
      const password = 'User@1';
      const res1 = await request(app)
        .post('/register')
        .send({
          username,
          email: `${username}@email.com`,
          type: 'admin',
          password,
        });
      expect(res1.status).toEqual(201);

      const res = await request(app).post('/login').send({
        username: 'incorrect_username',
        password,
      });
      expect(res.status).toBe(401);
    });
    describe('when the password is incorrect', () => {
      it('should return 401', async () => {
        const username = `user_${Date.now()}`;
        const password = 'User@1';
        const res1 = await request(app)
          .post('/register')
          .send({
            username,
            email: `${username}@email.com`,
            type: 'admin',
            password,
          });
        expect(res1.status).toEqual(201);

        const res = await request(app).post('/login').send({
          username,
          password: 'incorrect_password',
        });
        expect(res.status).toBe(401);
      });
    });
  });
});
