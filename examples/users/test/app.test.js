const request = require('supertest');
const app = require('../app.cjs');
test('health', async () => expect((await request(app).get('/health')).body.status).toBe('ok'));
test('known user', async () => expect((await request(app).get('/users/usr-1')).status).toBe(200));
test('missing user', async () => expect((await request(app).get('/users/missing')).status).toBe(404));
test('create user', async () => expect((await request(app).post('/users').send({ email: 'a@example.test' })).status).toBe(201));
test('invalid email', async () => expect((await request(app).post('/users').send({ email: 'bad' })).status).toBe(400));
