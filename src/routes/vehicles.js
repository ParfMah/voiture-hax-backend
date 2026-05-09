/**
 * src/routes/vehicles.js
 * Routes API véhicules Hax-ISA — CRUD complet + recherche + filtres
 */
'use strict';
const { requireAuth, requireAdmin } = require('../middleware/auth');

const Router = require('../utils/router');
const Vehicle  = require('../models/Vehicle');
const { sendSuccess, sendError, paginateQuery } = require('../utils/helpers');

const router = new Router();

// ============================================================
// GET /api/vehicles — Lista con filtri e paginazione
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { page, limit } = paginateQuery(req.query);
    const sort = req.query.sort || '-createdAt';

    const filtri = {
      tipo:       req.query.tipo,
      marca:      req.query.marca,
      carburante: req.query.carburante,
      categoria:  req.query.categoria,
      priceMin:   req.query.priceMin,
      priceMax:   req.query.priceMax,
      annoMin:    req.query.annoMin,
      annoMax:    req.query.annoMax,
      kmMax:      req.query.kmMax,
      q:          req.query.q,
    };
    // Rimuovere chiavi undefined
    Object.keys(filtri).forEach(k => filtri[k] === undefined && delete filtri[k]);

    const result = await Vehicle.cercaConFiltri(filtri, { page, limit, sort });
    sendSuccess(res, result, 'Veicoli recuperati');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// GET /api/vehicles/featured — Veicoli in evidenza
// ============================================================
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 6;
    const data  = await Vehicle.find({ inEvidenza: true, disponibile: true })
                               .sort('-createdAt')
                               .limit(limit)
                               .lean();
    sendSuccess(res, data, 'Veicoli in evidenza');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// GET /api/vehicles/search — Ricerca testuale rapida
// ============================================================
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return sendSuccess(res, [], 'Query troppo corta');
    }
    const data = await Vehicle.find({
      disponibile: true,
      $or: [
        { marca:    new RegExp(q, 'i') },
        { modello:  new RegExp(q, 'i') },
        { colore:   new RegExp(q, 'i') },
        { descrizione: new RegExp(q, 'i') },
      ],
    }).select('marca modello prezzo tipo anno immagini').limit(10).lean();
    sendSuccess(res, data, `${data.length} risultati`);
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// GET /api/vehicles/:id — Dettaglio veicolo
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).lean();
    if (!vehicle) return sendError(res, 'Veicolo non trovato', 404);

    // Incrementare il contatore visite (senza bloccare la risposta)
    Vehicle.findByIdAndUpdate(req.params.id, { $inc: { visite: 1 } }).catch(() => {});

    sendSuccess(res, vehicle, 'Veicolo trovato');
  } catch (err) {
    if (err.name === 'CastError') return sendError(res, 'ID non valido', 400);
    sendError(res, err.message, 500);
  }
});

// ============================================================
// GET /api/vehicles/:id/similar — Veicoli simili
// ============================================================
router.get('/:id/similar', async (req, res) => {
  try {
    const data = await Vehicle.trovaSimili(req.params.id, 4);
    sendSuccess(res, data, 'Veicoli simili');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// POST /api/vehicles — Crea nuovo veicolo [ADMIN]
// ============================================================
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};

    // Validazione campi obbligatori
    const required = ['marca','modello','tipo','anno','prezzo','carburante','cambio'];
    const missing  = required.filter(f => !body[f]);
    if (missing.length) {
      return sendError(res, `Campi obbligatori mancanti: ${missing.join(', ')}`, 422);
    }

    // Validazione tipo
    if (!['nuovo','usato'].includes(body.tipo)) {
      return sendError(res, 'Tipo deve essere nuovo o usato', 422);
    }

    const vehicle = new Vehicle(body);
    await vehicle.save();

    sendSuccess(res, vehicle.toObject(), 'Veicolo creato', 201);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return sendError(res, 'Errore di validazione', 422, errors);
    }
    sendError(res, err.message, 500);
  }
});

// ============================================================
// PUT /api/vehicles/:id — Aggiorna veicolo completo [ADMIN]
// ============================================================
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const body    = req.body || {};
    body.updatedAt = new Date();

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
    );
    if (!vehicle) return sendError(res, 'Veicolo non trovato', 404);
    sendSuccess(res, vehicle.toObject(), 'Veicolo aggiornato');
  } catch (err) {
    if (err.name === 'CastError')       return sendError(res, 'ID non valido', 400);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return sendError(res, 'Errore di validazione', 422, errors);
    }
    sendError(res, err.message, 500);
  }
});

// ============================================================
// PATCH /api/vehicles/:id — Aggiornamento parziale [ADMIN]
// ============================================================
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const allowed = [
      'prezzo','prezzoOld','disponibile','inEvidenza',
      'descrizione','immagini','equipaggiamento','storia',
      'colore','chilometri',
    ];
    const update = {};
    allowed.forEach(k => { if (req.body?.[k] !== undefined) update[k] = req.body[k]; });
    update.updatedAt = new Date();

    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!vehicle) return sendError(res, 'Veicolo non trovato', 404);
    sendSuccess(res, vehicle.toObject(), 'Veicolo aggiornato parzialmente');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// DELETE /api/vehicles/:id — Elimina veicolo [ADMIN]
// ============================================================
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) return sendError(res, 'Veicolo non trovato', 404);
    sendSuccess(res, { id: req.params.id }, 'Veicolo eliminato');
  } catch (err) {
    if (err.name === 'CastError') return sendError(res, 'ID non valido', 400);
    sendError(res, err.message, 500);
  }
});

module.exports = router;
