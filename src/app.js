/**
 * src/app.js
 * Configuration principale de l'application Express-like
 * Utilise uniquement le module http natif Node.js + bibliothèques légères
 *
 * ARCHITECTURE : Pas de framework Express — routeur maison basé sur http.createServer
 * conforme à la contrainte "pas de framework lourd structurant le projet"
 *
 * Bibliothèques autorisées utilisées :
 *  - mongoose  (ODM MongoDB)
 *  - jsonwebtoken (JWT)
 *  - bcryptjs   (hachage mdp)
 *  - multer     (upload fichiers)
 *  - cors       (headers CORS)
 *  - helmet     (sécurité headers HTTP)
 *  - dotenv     (variables d'environnement)
 *  - express-rate-limit (rate limiting) — utilisé comme middleware manuel
 */

'use strict';

const http   = require('http');
const url    = require('url');
const path   = require('path');
const fs     = require('fs');
const logger   = require('./utils/logger');
const { sanitizeBody, preventNoSQLInjection, maxBodySize, securityAudit } = require('./middleware/security');

// ============================================================
// ROUTEUR MAISON (sans Express)
// ============================================================
class Router {
  constructor() {
    this.routes = [];       // [{ method, pattern, handlers[] }]
    this.middlewares = [];  // middlewares globaux
  }

  // Enregistrer un middleware global
  use(fn) {
    this.middlewares.push(fn);
  }

  // Enregistrer une route
  _register(method, pattern, ...handlers) {
    this.routes.push({ method: method.toUpperCase(), pattern, handlers });
  }
  get(pattern, ...h)    { this._register('GET',    pattern, ...h); }
  post(pattern, ...h)   { this._register('POST',   pattern, ...h); }
  put(pattern, ...h)    { this._register('PUT',    pattern, ...h); }
  patch(pattern, ...h)  { this._register('PATCH',  pattern, ...h); }
  delete(pattern, ...h) { this._register('DELETE', pattern, ...h); }

  // Monter un sous-routeur sur un préfixe
  mount(prefix, subRouter) {
    subRouter.routes.forEach(route => {
      this.routes.push({
        method:   route.method,
        pattern:  prefix + route.pattern,
        handlers: route.handlers,
      });
    });
  }

  // Correspondance URL avec paramètres :id
  _match(pattern, pathname) {
    const patternParts  = pattern.split('/').filter(Boolean);
    const pathnameParts = pathname.split('/').filter(Boolean);
    if (patternParts.length !== pathnameParts.length) return null;
    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathnameParts[i]);
      } else if (patternParts[i] !== pathnameParts[i]) {
        return null;
      }
    }
    return params;
  }

  // Gestionnaire principal (passé à http.createServer)
  handler() {
    return async (req, res) => {
      const parsed   = url.parse(req.url, true);
      req.pathname   = parsed.pathname;
      req.query      = parsed.query;
      req.params     = {};
      req.body       = null;

      // Helper réponse JSON
      res.json = (data, status = 200) => {
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
      };
      res.status = (code) => { res._statusCode = code; return res; };

      try {
        // Lire le body JSON
        if (['POST','PUT','PATCH'].includes(req.method) &&
            req.headers['content-type']?.includes('application/json')) {
          req.body = await readBody(req);
        }

        // Appliquer les middlewares globaux en séquence
        await runMiddlewares(this.middlewares, req, res);

        // Trouver la route correspondante
        let matched = false;
        for (const route of this.routes) {
          if (route.method !== req.method) continue;
          const params = this._match(route.pattern, req.pathname);
          if (params === null) continue;

          req.params = params;
          matched = true;

          // Exécuter les handlers en chaîne (middleware-style)
          await runMiddlewares(route.handlers, req, res);
          break;
        }

        // Route introuvable
        if (!matched && !res.writableEnded) {
          res.json({ success: false, message: 'Endpoint non trovato' }, 404);
        }

      } catch (err) {
        if (!res.writableEnded) {
          logger.error('Errore handler:', err);
          const status  = err.statusCode || err.status || 500;
          const message = err.message || 'Errore interno del server';
          res.json({ success: false, message }, status);
        }
      }
    };
  }
}

// ============================================================
// HELPERS
// ============================================================

// Lire le body de la requête
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    const maxSize = 10 * 1024 * 1024; // 10 MB
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > maxSize) {
        reject(createError('Payload troppo grande', 413));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : null);
      } catch (e) {
        reject(createError('JSON non valido', 400));
      }
    });
    req.on('error', reject);
  });
}

// Exécuter une liste de middlewares en séquence
async function runMiddlewares(middlewares, req, res) {
  let i = 0;
  const next = async () => {
    if (i >= middlewares.length || res.writableEnded) return;
    const fn = middlewares[i++];
    await fn(req, res, next);
  };
  await next();
}

// Créer une erreur HTTP
function createError(message, statusCode = 500) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// ============================================================
// MIDDLEWARES GLOBAUX
// ============================================================

// CORS
function corsMiddleware(req, res, next) {
  const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim());
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  return next();
}

// Headers de sécurité (inspiré de Helmet)
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return next();
}

// Logger des requêtes
function requestLogger(req, res, next) {
  const start = Date.now();
  const originalEnd = res.end.bind(res);
  res.end = function(...args) {
    const duration = Date.now() - start;
    const status   = res.statusCode || 200;
    const color    = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    logger.info(`${color}${req.method}\x1b[0m ${req.pathname} ${color}${status}\x1b[0m ${duration}ms`);
    return originalEnd(...args);
  };
  return next();
}

// Rate limiter simple en mémoire
const rateLimitStore = new Map();
function rateLimiter(req, res, next) {
  const windowMs  = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
  const maxReq    = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100;
  const ip        = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const now       = Date.now();
  const entry     = rateLimitStore.get(ip) || { count: 0, resetAt: now + windowMs };

  // Réinitialiser si fenêtre expirée
  if (now > entry.resetAt) {
    entry.count   = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count++;
  rateLimitStore.set(ip, entry);

  res.setHeader('X-RateLimit-Limit',     maxReq);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxReq - entry.count));
  res.setHeader('X-RateLimit-Reset',     Math.ceil(entry.resetAt / 1000));

  if (entry.count > maxReq) {
    res.json({ success: false, message: 'Troppe richieste. Riprova tra poco.' }, 429);
    return;
  }
  return next();
}

// ============================================================
// CONSTRUCTION DE L'APPLICATION
// ============================================================
function createApp() {
  const router = new Router();

  // Middlewares globaux
  router.use(corsMiddleware);
  router.use(securityHeaders);
  router.use(requestLogger);
  router.use(rateLimiter);
  router.use(maxBodySize(10));
  router.use(securityAudit);
  router.use(sanitizeBody);
  router.use(preventNoSQLInjection);

  // Import et montage des routes
  const vehicleRoutes  = require('./routes/vehicles');
  const orderRoutes    = require('./routes/orders');
  const authRoutes     = require('./routes/auth');
  const userRoutes     = require('./routes/users');
  const creditRoutes   = require('./routes/credit');
  const contentRoutes  = require('./routes/content');
  const statsRoutes    = require('./routes/stats');
  const uploadRoutes   = require('./routes/upload');

  router.mount('/api/vehicles', vehicleRoutes);
  router.mount('/api/orders',   orderRoutes);
  router.mount('/api/auth',     authRoutes);
  router.mount('/api/users',    userRoutes);
  router.mount('/api/credit',   creditRoutes);
  // Route plan ammortamento già inclusa in creditRoutes
  router.mount('/api/content',  contentRoutes);
  router.mount('/api/stats',    statsRoutes);
  router.mount('/api/upload',   uploadRoutes);

  // Route health check
  router.get('/api/health', (req, res) => {
    res.json({
      success: true,
      status:  'OK',
      service: 'Hax-ISA API',
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()) + 's',
    });
  });

  // Servir les fichiers statiques du dossier uploads
  router.get('/uploads/:filename', (req, res) => {
    const filePath = path.join(__dirname, '..', 'uploads', req.params.filename);
    if (!fs.existsSync(filePath)) {
      res.json({ success: false, message: 'File non trovato' }, 404);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(filePath).pipe(res);
  });

  return router.handler();
}

module.exports = createApp();
module.exports.Router    = Router;
module.exports.createError = createError;
