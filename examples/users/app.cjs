const express = require('express');
const app = express();
app.use(express.json());
const users = new Map([['usr-1', { id: 'usr-1', email: 'demo@example.test' }]]);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/users/:id', (req, res) => {
  const user = users.get(req.params.id);
  return user ? res.json(user) : res.status(404).json({ error: 'User not found' });
});
app.post('/users', (req, res) => {
  const email = req.body?.email;
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email' });
  const user = { id: 'usr-' + (users.size + 1), email };
  users.set(user.id, user);
  return res.status(201).json(user);
});
module.exports = app;
