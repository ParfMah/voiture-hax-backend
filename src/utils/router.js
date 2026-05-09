'use strict';

const url = require('url');

class Router {
  constructor() {
    this.routes = [];
    this.middlewares = [];
  }

  use(fn) {
    this.middlewares.push(fn);
  }

  _register(method, pattern, ...handlers) {
    this.routes.push({ method: method.toUpperCase(), pattern, handlers });
  }

  get(pattern, ...h)    { this._register('GET',    pattern, ...h); }
  post(pattern, ...h)   { this._register('POST',   pattern, ...h); }
  put(pattern, ...h)    { this._register('PUT',    pattern, ...h); }
  patch(pattern, ...h)  { this._register('PATCH',  pattern, ...h); }
  delete(pattern, ...h) { this._register('DELETE', pattern, ...h); }

  mount(prefix, subRouter) {
    subRouter.routes.forEach(route => {
      this.routes.push({
        method:   route.method,
        pattern:  prefix + route.pattern,
        handlers: route.handlers,
      });
    });
  }

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

  handler(readBody, runMiddlewares, createError, logger) {
    return async (req, res) => {
      const parsed   = url.parse(req.url, true);
      req.pathname   = parsed.pathname;
      req.query      = parsed.query;
      req.params     = {};
      req.body       = null;

      res.json = (data, status = 200) => {
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
      };
      res.status = (code) => { res.statusCode = code; return res; };

      try {
        if (['POST','PUT','PATCH'].includes(req.method) &&
            req.headers['content-type']?.includes('application/json')) {
          req.body = await readBody(req);
        }

        await runMiddlewares(this.middlewares, req, res);

        let matched = false;
        for (const route of this.routes) {
          if (route.method !== req.method) continue;
          const params = this._match(route.pattern, req.pathname);
          if (params === null) continue;

          req.params = params;
          matched = true;
          await runMiddlewares(route.handlers, req, res);
          break;
        }

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

module.exports = Router;