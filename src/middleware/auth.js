/**
 * src/middleware/auth.js
 * Middleware d'authentification JWT pour Hax-ISA
 */
'use strict';

const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'hax_isa_super_secret_key_change_in_production_32chars';

// ============================================================
// VÉRIFICATION TOKEN JWT
// ============================================================

/**
 * Middleware: vérifie le token JWT et attache l'utilisateur à req.user
 * Bloque la requête si le token est absent ou invalide
 */
async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      res.json({ success: false, message: 'Token di autenticazione mancante' }, 401);
      return;
    }

    // Vérifier et décoder le token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        res.json({ success: false, message: 'Token scaduto — effettua di nuovo il login' }, 401);
      } else {
        res.json({ success: false, message: 'Token non valido' }, 401);
      }
      return;
    }

    // Récupérer l'utilisateur depuis la DB
    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      res.json({ success: false, message: 'Utente non trovato' }, 401);
      return;
    }
    if (!user.attivo) {
      res.json({ success: false, message: 'Account disattivato' }, 403);
      return;
    }

    // Attacher l'utilisateur à la requête
    req.user = user;
    req.userId = user._id.toString();
    await next();

  } catch (err) {
    logger.error('Errore middleware auth:', err);
    res.json({ success: false, message: 'Errore di autenticazione' }, 500);
  }
}

/**
 * Middleware: vérifie que l'utilisateur est admin
 * Doit être utilisé APRÈS requireAuth
 */
async function requireAdmin(req, res, next) {
  if (!req.user) {
    res.json({ success: false, message: 'Autenticazione richiesta' }, 401);
    return;
  }
  if (req.user.ruolo !== 'admin') {
    res.json({ success: false, message: 'Accesso riservato agli amministratori' }, 403);
    return;
  }
  await next();
}

/**
 * Middleware: auth opzionale (non blocca se assente)
 * Popola req.user se il token è valido, altrimenti req.user = null
 */
async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user    = await User.findById(decoded.userId).lean();
        if (user && user.attivo) req.user = user;
      } catch (e) { /* token invalide — continuer sans auth */ }
    }
  } catch (e) { /* ignorer */ }
  await next();
}

// Extraire le token du header Authorization
function extractToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return authHeader;
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
