/**
 * src/routes/auth.js
 * Routes authentification JWT Hax-ISA — Login, logout, me, refresh
 */
'use strict';

const { Router }  = require('../app');
const jwt         = require('jsonwebtoken');
const User        = require('../models/User');
const { sendSuccess, sendError } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');
const logger      = require('../utils/logger');
const { loginRateLimit, resetLoginAttempts } = require('../middleware/security');

const router     = new Router();
const JWT_SECRET = process.env.JWT_SECRET || 'hax_isa_super_secret_key_change_in_production_32chars';
const JWT_EXP    = process.env.JWT_EXPIRES_IN || '7d';

// Token factory
function signToken(userId, ruolo) {
  return jwt.sign({ userId, ruolo }, JWT_SECRET, { expiresIn: JWT_EXP });
}
function signRefresh(userId) {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });
}

// ============================================================
// POST /api/auth/login
// ============================================================
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return sendError(res, 'Email e password obbligatori', 422);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendError(res, 'Email non valida', 422);
    }

    // Recuperare l'utente con la password
    const user = await User.trovaPerLogin(email);
    if (!user) {
      return sendError(res, 'Credenziali non valide', 401);
    }

    // Verificare la password
    const passwordOk = await user.verificaPassword(password);
    if (!passwordOk) {
      logger.warn(`Login fallito per: ${email}`);
      return sendError(res, 'Credenziali non valide', 401);
    }

    // Generare token
    const token        = signToken(user._id, user.ruolo);
    const refreshToken = signRefresh(user._id);

    // Salvare il refresh token nel DB
    user.refreshToken    = refreshToken;
    user.ultimoAccesso   = new Date();
    await user.save({ validateModifiedOnly: true });

    logger.info(`Login riuscito: ${email} (${user.ruolo})`);
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    resetLoginAttempts(clientIp);

    sendSuccess(res, {
      token,
      refreshToken,
      user: {
        _id:      user._id,
        nome:     user.nome,
        cognome:  user.cognome,
        email:    user.email,
        ruolo:    user.ruolo,
        iniziali: ((user.nome?.[0]||'') + (user.cognome?.[0]||'')).toUpperCase(),
      },
    }, 'Login effettuato con successo');

  } catch (err) {
    logger.error('Errore login:', err);
    sendError(res, 'Errore interno', 500);
  }
});

// ============================================================
// POST /api/auth/logout
// ============================================================
router.post('/logout', requireAuth, async (req, res) => {
  try {
    // Invalidare il refresh token
    await User.findByIdAndUpdate(req.userId, { refreshToken: null });
    sendSuccess(res, null, 'Logout effettuato');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// GET /api/auth/me — Profilo utente corrente
// ============================================================
router.get('/me', requireAuth, async (req, res) => {
  try {
    sendSuccess(res, {
      _id:       req.user._id,
      nome:      req.user.nome,
      cognome:   req.user.cognome,
      email:     req.user.email,
      ruolo:     req.user.ruolo,
      attivo:    req.user.attivo,
      createdAt: req.user.createdAt,
      ultimoAccesso: req.user.ultimoAccesso,
      iniziali: ((req.user.nome?.[0]||'')+(req.user.cognome?.[0]||'')).toUpperCase(),
    }, 'Profilo utente');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// POST /api/auth/refresh — Rinnova access token
// ============================================================
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return sendError(res, 'Refresh token mancante', 422);

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (e) {
      return sendError(res, 'Refresh token non valido o scaduto', 401);
    }

    if (decoded.type !== 'refresh') return sendError(res, 'Token non valido', 401);

    const user = await User.findById(decoded.userId).select('+refreshToken').lean();
    if (!user || user.refreshToken !== refreshToken) {
      return sendError(res, 'Refresh token non riconosciuto', 401);
    }
    if (!user.attivo) return sendError(res, 'Account disattivato', 403);

    const newToken = signToken(user._id, user.ruolo);
    sendSuccess(res, { token: newToken }, 'Token rinnovato');

  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// PUT /api/auth/password — Cambio password
// ============================================================
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return sendError(res, 'Password attuale e nuova obbligatorie', 422);
    }
    if (newPassword.length < 8) {
      return sendError(res, 'La nuova password deve avere almeno 8 caratteri', 422);
    }

    const user = await User.findById(req.userId).select('+password');
    const ok   = await user.verificaPassword(currentPassword);
    if (!ok) return sendError(res, 'Password attuale non corretta', 401);

    user.password = newPassword; // pre-save hook fa l'hash
    await user.save();
    sendSuccess(res, null, 'Password aggiornata con successo');

  } catch (err) {
    sendError(res, err.message, 500);
  }
});

module.exports = router;
