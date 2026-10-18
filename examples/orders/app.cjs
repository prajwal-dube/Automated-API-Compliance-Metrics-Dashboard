const express = require('express');
const app = express();
app.use(express.json());
const orders = new Map([['ord-1', { id: 'ord-1', amount: 25, status: 'CREATED' }]]);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/orders/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  return res.json(order);
});
app.post('/orders', (req, res) => {
  if (!Number.isFinite(req.body?.amount) || req.body.amount <= 0)
    return res.status(400).json({ error: 'Amount must be positive' });
  const id = 'ord-' + (orders.size + 1);
  const order = { id, amount: req.body.amount, status: 'CREATED' };
  orders.set(id, order);
  return res.status(201).json(order);
});
module.exports = app;
