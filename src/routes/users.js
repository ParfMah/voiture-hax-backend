/**
 * src/routes/users.js
 * Routes API utenti Hax-ISA [ADMIN]
 */
'use strict';
const { requireAuth, requireAdmin } = require('../middleware/auth');

const { Router } = require('../app');
const User = require('../models/User');
const { sendSuccess, sendError, paginateQuery } = require('../utils/helpers');

const router = new Router();

// GET /api/users
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page, limit } = paginateQuery(req.query);
    const result = await User.listaPaginata({
      page, limit,
      ruolo: req.query.ruolo,
      q:     req.query.q,
    });
    sendSuccess(res, result, 'Utenti recuperati');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return sendError(res, 'Utente non trovato', 404);
    sendSuccess(res, user, 'Utente trovato');
  } catch (err) {
    if (err.name === 'CastError') return sendError(res, 'ID non valido', 400);
    sendError(res, err.message, 500);
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.nome || !body.cognome || !body.email || !body.password) {
      return sendError(res, 'Nome, cognome, email e password obbligatori', 422);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return sendError(res, 'Email non valida', 422);
    }
    const exists = await User.findOne({ email: body.email.toLowerCase() });
    if (exists) return sendError(res, 'Email già registrata', 409);

    const user = new User(body);
    await user.save();
    sendSuccess(res, user.toJSON(), 'Utente creato', 201);
  } catch (err) {
    if (err.code === 11000) return sendError(res, 'Email già in uso', 409);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return sendError(res, 'Errore di validazione', 422, errors);
    }
    sendError(res, err.message, 500);
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const body = req.body || {};
    // Non permettere cambio password tramite PUT diretto
    delete body.password;
    delete body.refreshToken;
    delete body.resetPasswordToken;

    const user = await User.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!user) return sendError(res, 'Utente non trovato', 404);
    sendSuccess(res, user.toJSON(), 'Utente aggiornato');
  } catch (err) {
    if (err.name === 'CastError') return sendError(res, 'ID non valido', 400);
    sendError(res, err.message, 500);
  }
});

// DELETE /api/users/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return sendError(res, 'Utente non trovato', 404);
    sendSuccess(res, { id: req.params.id }, 'Utente eliminato');
  } catch (err) {
    if (err.name === 'CastError') return sendError(res, 'ID non valido', 400);
    sendError(res, err.message, 500);
  }
});

module.exports = router;
