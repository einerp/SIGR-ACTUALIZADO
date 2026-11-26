const express = require('express');
const rateLimit = require('express-rate-limit');
const { changeCredentials, clearSession, login, requireAuth } = require('../services/authService');
const { publicUser } = require('../repositories/authStore');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.' },
  skip: () => process.env.NODE_ENV === 'test'
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const user = await login(req.body, res);
    res.json({ ok: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true, data: publicUser(req.user) });
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.put('/credentials', requireAuth, async (req, res, next) => {
  try {
    const user = await changeCredentials(req.user.id, req.body, res);
    res.json({ ok: true, data: user, message: 'Credenciales actualizadas correctamente.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
