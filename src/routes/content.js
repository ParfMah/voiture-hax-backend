/**
 * src/routes/content.js
 * Routes API contenuto CMS Hax-ISA
 */
'use strict';
const { requireAuth, requireAdmin } = require('../middleware/auth');

const Router = require('../utils/router');
const Content = require('../models/Content');
const { sendSuccess, sendError } = require('../utils/helpers');

const router = new Router();

// GET /api/content — Tutti i contenuti
router.get('/', async (req, res) => {
  try {
    const data = await Content.getAll();
    // Convertire in oggetto chiave->valore per il frontend
    const map = {};
    data.forEach(c => { map[c.chiave] = c.corpo; });
    sendSuccess(res, { list: data, map }, 'Contenuti recuperati');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// GET /api/content/:key — Singolo contenuto
router.get('/:key', async (req, res) => {
  try {
    const content = await Content.getByChiave(req.params.key);
    if (!content) return sendError(res, 'Contenuto non trovato', 404);
    sendSuccess(res, content, 'Contenuto trovato');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// PUT /api/content/:key — Aggiorna o crea contenuto [ADMIN]
router.put('/:key', requireAuth, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.corpo && body.corpo !== '') return sendError(res, 'Corpo del contenuto obbligatorio', 422);

    const content = await Content.findOneAndUpdate(
      { chiave: req.params.key },
      { ...body, chiave: req.params.key, updatedAt: new Date() },
      { upsert: true, new: true, runValidators: true }
    );
    sendSuccess(res, content.toObject(), 'Contenuto aggiornato');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

module.exports = router;
