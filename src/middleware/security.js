/**
 * src/middleware/security.js
 * Middleware de sécurité avancée pour Hax-ISA
 * Protection XSS, CSRF, injection, sanitisation
 */
'use strict';

const logger = require('../utils/logger');

// ============================================================
// SANITISATION DES INPUTS (protection XSS basique)
// ============================================================

const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=/gi,
  /<iframe[\s\S]*?>/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi,
];

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  let s = str.trim();
  XSS_PATTERNS.forEach(pattern => { s = s.replace(pattern, ''); });
  return s.replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;');
}

function sanitizeObject(obj, depth = 0) {
  if (depth > 5) return obj; // éviter la récursion infinie
  if (!obj || typeof obj !== 'object') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item, depth + 1));
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const safeKey = sanitizeString(key);
    result[safeKey] = typeof value === 'object' && value !== null
      ? sanitizeObject(value, depth + 1)
      : sanitizeString(value);
  }
  return result;
}

/**
 * Middleware: sanitise automatiquement req.body
 */
async function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  await next();
}

// ============================================================
// PROTECTION INJECTION NOSQL (MongoDB)
// ============================================================

const NOSQL_OPERATORS = ['$where', '$regex', '$ne', '$gt', '$lt', '$gte', '$lte', '$in', '$nin', '$or', '$and'];

function hasInjection(obj, depth = 0) {
  if (depth > 5 || !obj || typeof obj !== 'object') return false;
  for (const key of Object.keys(obj)) {
    if (NOSQL_OPERATORS.includes(key)) return true;
    if (typeof obj[key] === 'object' && hasInjection(obj[key], depth + 1)) return true;
  }
  return false;
}

/**
 * Middleware: détecte et bloque les tentatives d'injection NoSQL
 */
async function preventNoSQLInjection(req, res, next) {
  if (req.body && hasInjection(req.body)) {
    logger.warn(`⚠️  Tentativo injection NoSQL da ${req.socket?.remoteAddress}: ${req.pathname}`);
    res.json({ success: false, message: 'Richiesta non valida' }, 400);
    return;
  }
  // Vérifier aussi les query params
  if (req.query) {
    for (const value of Object.values(req.query)) {
      if (typeof value === 'string' && (value.includes('$') || value.includes('{') )) {
        res.json({ success: false, message: 'Parametri non validi' }, 400);
        return;
      }
    }
  }
  await next();
}

// ============================================================
// VALIDATION TAILLE DES REQUÊTES
// ============================================================

/**
 * Middleware: vérifie que la requête ne dépasse pas la taille max
 */
function maxBodySize(maxMB = 10) {
  const maxBytes = maxMB * 1024 * 1024;
  return async (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'], 10);
    if (contentLength && contentLength > maxBytes) {
      res.json({ success: false, message: `Payload troppo grande (max ${maxMB}MB)` }, 413);
      return;
    }
    await next();
  };
}

// ============================================================
// LOGGING DE SÉCURITÉ
// ============================================================

const SUSPICIOUS_PATTERNS = [
  /(\.\.|\/\/|\\\\)/,       // path traversal
  /(union|select|insert|update|delete|drop)\s/i,  // SQL injection
  /<script|javascript:/i,   // XSS
  /\$\{.*\}/,               // template injection
];

/**
 * Middleware: log les requêtes suspectes
 */
async function securityAudit(req, res, next) {
  const fullUrl  = req.pathname + (req.headers['x-original-url'] || '');
  const bodyStr  = req.body ? JSON.stringify(req.body) : '';
  const combined = fullUrl + bodyStr;

  const suspicious = SUSPICIOUS_PATTERNS.some(p => p.test(combined));
  if (suspicious) {
    logger.warn(`🚨 Richiesta sospetta [${req.method}] ${req.pathname} da ${req.socket?.remoteAddress}`);
  }
  await next();
}

// ============================================================
// RATE LIMITING PER ENDPOINT (più restrittivo per login)
// ============================================================
const loginAttempts = new Map();
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS    = 15 * 60 * 1000; // 15 minuti

/**
 * Middleware: rate limiting specifico per il login
 */
async function loginRateLimit(req, res, next) {
  const ip  = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const key = `login:${ip}`;

  const entry = loginAttempts.get(key) || { count: 0, resetAt: now + LOGIN_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count   = 0;
    entry.resetAt = now + LOGIN_WINDOW_MS;
  }
  entry.count++;
  loginAttempts.set(key, entry);

  if (entry.count > LOGIN_MAX_ATTEMPTS) {
    const waitMin = Math.ceil((entry.resetAt - now) / 60000);
    logger.warn(`🚫 Troppi tentativi di login da ${ip}`);
    res.json({
      success: false,
      message: `Troppi tentativi di accesso. Riprova tra ${waitMin} minuti.`,
    }, 429);
    return;
  }
  await next();
}

// Réinitialiser le compteur après un login réussi
function resetLoginAttempts(ip) {
  loginAttempts.delete(`login:${ip}`);
}

module.exports = {
  sanitizeBody,
  preventNoSQLInjection,
  maxBodySize,
  securityAudit,
  loginRateLimit,
  resetLoginAttempts,
  sanitizeString,
  sanitizeObject,
};
