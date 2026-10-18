const request = require('supertest');
const app = require('../app.cjs');
test('health', async () => expect((await request(app).get('/health')).status).toBe(200));
test('known order', async () => expect((await request(app).get('/orders/ord-1')).body.amount).toBe(25));
test('missing order', async () => expect((await request(app).get('/orders/missing')).status).toBe(404));
test('create order', async () => expect((await request(app).post('/orders').send({ amount: 19 })).status).toBe(201));
test('invalid amount', async () => expect((await request(app).post('/orders').send({ amount: -1 })).status).toBe(400));
