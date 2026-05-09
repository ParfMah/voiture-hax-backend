/**
 * src/routes/orders.js
 * Routes API ordini Hax-ISA
 */
'use strict';
const { requireAuth, requireAdmin } = require('../middleware/auth');

const Router = require('../utils/router');
const Order   = require('../models/Order');
const Vehicle = require('../models/Vehicle');
const { sendSuccess, sendError, paginateQuery } = require('../utils/helpers');
const { cambiaStatoOrdine } = require('../controllers/ordersController');

const router = new Router();

// ============================================================
// POST /api/orders — Crea nuovo ordine
// ============================================================
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};

    // Validazione dati obbligatori
    if (!body.vehicleId)   return sendError(res, 'ID veicolo obbligatorio', 422);
    if (!body.paymentMode) return sendError(res, 'Modalità pagamento obbligatoria', 422);
    if (!body.customer)    return sendError(res, 'Dati cliente obbligatori', 422);

    const { customer, paymentMode, credit } = body;

    // Validazione cliente
    const required = ['nome','cognome','email','telefono'];
    const missing  = required.filter(f => !customer[f]?.trim());
    if (missing.length) return sendError(res, `Dati cliente incompleti: ${missing.join(', ')}`, 422);

    // Validazione email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      return sendError(res, 'Email cliente non valida', 422);
    }

    // Validazione credito obbligatoria
    if (paymentMode === 'credit') {
      if (!credit) return sendError(res, 'Dati finanziamento obbligatori per acquisto a credito', 422);
      if (!credit.isValid) return sendError(res, 'Simulazione credito non valida', 422);
      if (!credit.deposit || credit.deposit <= 0) return sendError(res, 'Acconto obbligatorio', 422);
    }

    // Recuperare il veicolo per lo snapshot
    let vehicleSnapshot = {};
    try {
      const v = await Vehicle.findById(body.vehicleId).lean();
      if (v) {
        vehicleSnapshot = { marca: v.marca, modello: v.modello, anno: v.anno, prezzo: v.prezzo, tipo: v.tipo };
        // Verificare disponibilità
        if (!v.disponibile) return sendError(res, 'Veicolo non più disponibile', 409);
      }
    } catch (e) { /* ID non valido o veicolo demo */ }

    // Calcolare importo totale
    const importoTotale = paymentMode === 'credit' && credit?.totalCost
      ? credit.totalCost
      : vehicleSnapshot.prezzo || 0;

    // Creare l'ordine
    const order = new Order({
      vehicleId:       body.vehicleId,
      vehicleSnapshot,
      paymentMode,
      credit:          paymentMode === 'credit' ? credit : null,
      customer: {
        nome:              customer.nome?.trim(),
        cognome:           customer.cognome?.trim(),
        email:             customer.email?.trim().toLowerCase(),
        telefono:          customer.telefono?.trim(),
        codiceFiscale:     customer.codiceFiscale?.trim().toUpperCase(),
        dataNascita:       customer.dataNascita,
        indirizzo:         customer.indirizzo?.trim(),
        cap:               customer.cap?.trim(),
        citta:             customer.citta?.trim(),
        provincia:         customer.provincia?.trim(),
        paese:             customer.paese || 'Italia',
        consegnaIndirizzo: customer.consegnaIndirizzo?.trim(),
        consegnaCap:       customer.consegnaCap?.trim(),
        consegnaCitta:     customer.consegnaCitta?.trim(),
        noteConsegna:      customer.noteConsegna?.trim(),
      },
      stato:          'in_attesa',
      importoTotale,
      storicoStati:   [{ stato: 'in_attesa', data: new Date(), nota: 'Ordine creato', operatore: 'sistema' }],
    });

    await order.save();

    // Marcare il veicolo come non disponibile (opzionale — solo se ordine confermato)
    // await Vehicle.findByIdAndUpdate(body.vehicleId, { disponibile: false });

    sendSuccess(res, {
      _id:       order._id,
      orderId:   order.orderId,
      stato:     order.stato,
      createdAt: order.createdAt,
    }, 'Ordine creato con successo', 201);

  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return sendError(res, 'Errore di validazione', 422, errors);
    }
    sendError(res, err.message, 500);
  }
});

// ============================================================
// GET /api/orders — Lista ordini [ADMIN]
// ============================================================
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page, limit } = paginateQuery(req.query);
    const result = await Order.listaPaginata({
      page, limit,
      stato: req.query.stato,
      q:     req.query.q,
    });
    sendSuccess(res, result, 'Ordini recuperati');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// GET /api/orders/:id — Dettaglio ordine
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    // Cercare per orderId (es. HAX-2024-001) oppure per _id MongoDB
    let order = await Order.findOne({ orderId: req.params.id });
    if (!order) order = await Order.findById(req.params.id).catch(() => null);
    if (!order) return sendError(res, 'Ordine non trovato', 404);
    sendSuccess(res, order.toObject(), 'Ordine trovato');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// PATCH /api/orders/:id/status — Cambia stato [ADMIN]
// ============================================================
router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, nota, operatore } = req.body || {};
    if (!status) return sendError(res, 'Nuovo stato obbligatorio', 422);

    const statiValidi = ['in_attesa','validata','rifiutata','in_lavorazione','consegnata','annullata'];
    if (!statiValidi.includes(status)) {
      return sendError(res, `Stato non valido. Valori ammessi: ${statiValidi.join(', ')}`, 422);
    }

    const order = await cambiaStatoOrdine(req.params.id, status, nota || '', operatore || 'admin');
    sendSuccess(res, order.toObject(), `Stato aggiornato: ${status}`);
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// GET /api/orders/customer/:email — Ordini per email cliente
// ============================================================
router.get('/customer/:email', async (req, res) => {
  try {
    const email  = decodeURIComponent(req.params.email).toLowerCase();
    const orders = await Order.find({ 'customer.email': email })
                              .sort('-createdAt')
                              .lean();
    sendSuccess(res, orders, `${orders.length} ordini trovati`);
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

module.exports = router;
