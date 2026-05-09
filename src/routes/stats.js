/**
 * src/routes/stats.js
 * Routes statistiche dashboard CMS Hax-ISA [ADMIN]
 */
'use strict';
const { requireAuth, requireAdmin } = require('../middleware/auth');

const Router = require('../utils/router');
const Vehicle = require('../models/Vehicle');
const Order   = require('../models/Order');
const User    = require('../models/User');
const { sendSuccess, sendError } = require('../utils/helpers');

const router = new Router();

// GET /api/stats/dashboard — Dashboard completo
router.get('/dashboard', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [
      totaleVeicoli,
      veicoliDisponibili,
      veicoliNuovi,
      veicoliUsati,
      totaleOrdini,
      ordiniInAttesa,
      ordiniValidati,
      ordiniConsegnati,
      totaleUtenti,
      utentiClienti,
      ultimi5Ordini,
      ultimi5Veicoli,
      ordiniPerStato,
      veicoli30gg,
    ] = await Promise.all([
      Vehicle.countDocuments({}),
      Vehicle.countDocuments({ disponibile: true }),
      Vehicle.countDocuments({ tipo: 'nuovo' }),
      Vehicle.countDocuments({ tipo: 'usato' }),
      Order.countDocuments({}),
      Order.countDocuments({ stato: 'in_attesa' }),
      Order.countDocuments({ stato: 'validata' }),
      Order.countDocuments({ stato: 'consegnata' }),
      User.countDocuments({}),
      User.countDocuments({ ruolo: 'cliente' }),
      Order.find({}).sort('-createdAt').limit(5)
           .select('orderId stato customer.nome customer.cognome createdAt importoTotale paymentMode')
           .lean(),
      Vehicle.find({}).sort('-createdAt').limit(5)
             .select('marca modello prezzo tipo disponibile createdAt')
             .lean(),
      Order.statistiche(),
      Vehicle.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) } }),
    ]);

    // Valore totale ordini validati
    const aggregazioneValore = await Order.aggregate([
      { $match: { stato: { $in: ['validata','consegnata'] } } },
      { $group: { _id: null, totale: { $sum: '$importoTotale' } } },
    ]);
    const valoreOrdini = aggregazioneValore[0]?.totale || 0;

    // Top marche più ordinate
    const topMarchePipeline = await Order.aggregate([
      { $match: { 'vehicleSnapshot.marca': { $exists: true } } },
      { $group: { _id: '$vehicleSnapshot.marca', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Trend ordini ultimi 7 giorni
    const settimana = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    }).reverse();

    const trendPipeline = await Order.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
      }},
    ]);
    const trendMap = {};
    trendPipeline.forEach(t => { trendMap[t._id] = t.count; });
    const trendOrdini = settimana.map(d => ({ data: d, count: trendMap[d] || 0 }));

    sendSuccess(res, {
      kpi: {
        totaleVeicoli, veicoliDisponibili, veicoliNuovi, veicoliUsati,
        totaleOrdini, ordiniInAttesa, ordiniValidati, ordiniConsegnati,
        totaleUtenti, utentiClienti, valoreOrdini, veicoli30gg,
      },
      ordiniPerStato,
      topMarche: topMarchePipeline,
      trendOrdini,
      ultimi5Ordini,
      ultimi5Veicoli,
    }, 'Dashboard caricata');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// GET /api/stats/vehicles — Statistiche veicoli
router.get('/vehicles', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [
      perTipo, perCarburante, perCategoria, perMarca, prezzoMedio,
    ] = await Promise.all([
      Vehicle.aggregate([{ $group: { _id: '$tipo', count: { $sum: 1 } } }]),
      Vehicle.aggregate([{ $group: { _id: '$carburante', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Vehicle.aggregate([{ $group: { _id: '$categoria', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Vehicle.aggregate([{ $group: { _id: '$marca', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      Vehicle.aggregate([{ $group: { _id: null, avg: { $avg: '$prezzo' }, min: { $min: '$prezzo' }, max: { $max: '$prezzo' } } }]),
    ]);
    sendSuccess(res, { perTipo, perCarburante, perCategoria, perMarca, prezzoMedio: prezzoMedio[0] }, 'Statistiche veicoli');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// GET /api/stats/orders — Statistiche ordini
router.get('/orders', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [perStato, perModalita, valore12mesi] = await Promise.all([
      Order.aggregate([{ $group: { _id: '$stato', count: { $sum: 1 }, totale: { $sum: '$importoTotale' } } }]),
      Order.aggregate([{ $group: { _id: '$paymentMode', count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 365*24*60*60*1000) } } },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 }, valore: { $sum: '$importoTotale' },
        }},
        { $sort: { _id: 1 } },
      ]),
    ]);
    sendSuccess(res, { perStato, perModalita, valore12mesi }, 'Statistiche ordini');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

module.exports = router;
